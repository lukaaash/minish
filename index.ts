import readline = require("readline");
import events = require("events");
import tty = require("tty");
import util = require("util");
import argler = require("argler");
import minimist = require("minimist");

// MiniConsole states
const enum State {
    None = 0,
    Idle = 1,
    Prompt = 2,
    Custom = 3,
    Closed = 4,
}

var undefined;

// MiniConsole is a wrapper around readline
class MiniConsole {
    //extends events.EventEmitter {

    private _input: NodeJS.ReadableStream;
    private _output: NodeJS.WritableStream;
    private _readline: readline.ReadLine;
    private _callback: (result: string) => void;
    private _keypress: (s, key) => void; // custom keypress handler
    private _state: State;
    private _isTTY: boolean;

    constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream) {
        //super();

        this._input = input || process.stdin;
        this._output = output || process.stdout;
        this._readline = null;
        this._callback = null;
        this._keypress = null;
        this._state = State.None;
        
        // determine whether we have a TTY
        this._isTTY = (typeof (<any>this._input).setRawMode === "function") && (<any>this._output).isTTY;
    }

    // initializes readline lazily
    private _init(): void {
        if (this._state == State.Closed) throw new Error("Already closed");
        if (this._state != State.None) return;
        this._state = State.Idle;

        var readlineOptions = {
            input: this._input,
            output: this._output,
        };

        // get list of keypress event listeners on input stream
        var keypressListeners = this._input.listeners("keypress");

        // create readline instance and register close event handler
        this._readline = readline.createInterface(readlineOptions);
        this._readline.once("close",() => this._terminate());

        // remove and keep keypress listeners on input stream that were set up by readline 
        // (we will call them ourselves)
        var newKeypressListeners = this._input.listeners("keypress");
        var listeners = [];
        for (var i = keypressListeners.length; i < newKeypressListeners.length; i++) {
            var listener = newKeypressListeners[i];
            this._input.removeListener("keypress", listener);
            listeners.push(listener);
        }

        // set up a custom keypress handler
        this._input.on("keypress",(s, key) => {
            if (key && key.ctrl && !key.shift) {
                switch (key.name) {
                    case 'd':
                        break;
                    case 'c': // Ctrl+Z (EOT)
                        //if (this.emit('SIGINT')) return;
                        this._terminate();
                        return;
                    case 'z': // Ctrl+Z (EOF)
                        if (process.platform == 'win32') return;
                        //if (this.emit('SIGTSTP')) return;

                        var input = <tty.ReadStream>this._input;

                        process.once('SIGCONT',() => {
                            //this.emit("SIGCONT");
                            input.resume();
                            input.setRawMode(true);
                        });

                        input.pause();
                        input.setRawMode(false);
                        process.kill(process.pid, 'SIGTSTP');
                        return;
                }
            }

            // pass the event args to custom keypress handler
            if (typeof this._keypress === "function") {
                this._keypress(s, key);
            }

            // pass the event args to readline's listeners
            if (this._state == State.Prompt) {
                listeners.forEach(listener => listener.call(null, s, key));
            }
        });
    }

    // prepare the for an async function
    private _prepare(callback: (result: string) => void): void {
        if (typeof callback !== "function") throw new TypeError("Callback must be a function");
        if (this._callback) throw new Error("Already prompting");
        this._callback = callback;

        this._init();
    }

    // terminates the process
    private _terminate(): void {
        this._callback = null;
        this._state = State.Closed;
        this._output.write("\n");
        //if (this.emit("close")) return;
        process.exit(128 + 2);
    }

    // asks a question and calls the supplied function when it is answered
    question(prompt: string, options?: minish.IQuestionOptions, callback?: (reply: string) => void): void {
        if (typeof prompt !== "string" && !(<any>prompt instanceof String)) {
            throw new TypeError("Prompt must be a string");
        }

        if (callback === undefined && typeof options === "function") {
            callback = <any>options;
            options = undefined;
        }

        options = options || {};
        prompt = "" + prompt;
        if (prompt.length > 0 && !options.noSpace) prompt += " ";

        this._prepare(callback);
        this._text(prompt, options);
    }

    // asks for a password and calls the supplied function when done
    password(prompt: string, options?: minish.IPasswordOptions, callback?: (password: string) => void): void {
        if (typeof prompt !== "string" && !(<any>prompt instanceof String)) {
            throw new TypeError("Prompt must be a string");
        }

        if (callback === undefined && typeof options === "function") {
            callback = <any>options;
            options = undefined;
        }

        prompt = "" + prompt;
        options = options || {};
        
        this._prepare(callback);
        this._password(prompt, options);
    }

    // starts prompting for a text
    private _text(prompt: string, options: minish.IQuestionOptions): void {
        this._readline.once("line",(line: string) => {
            var cb = this._callback;
            this._callback = null;
            this._state = State.Idle;

            if (cb) process.nextTick(() => cb(line));
        });

        (<any>this._readline).setPrompt(prompt);        
        var preserveCursor = false;

        this._state = State.Prompt;
        this._readline.prompt(preserveCursor);
    }

    // prompts for a password
    private _password(prompt: string, options: minish.IPasswordOptions): void {
        if (!this._isTTY) throw new Error("Secret text prompt only supported on TTY streams");

        var passwordChar = "" + options.passwordChar;
        var silent = false;
        if (passwordChar.length == 0) {
            silent = true;
        } else {
            passwordChar = passwordChar[0];
        }

        var input = <tty.ReadStream>this._input;
        var output = this._output;
        var password = "";
        var self = this;

        // use custom keypress handling instead of readline's
        this._state = State.Custom;
        this._keypress = keypress;

        // display prompt if specified
        if (prompt.length > 0) {
            if (!options.noSpace) prompt += " ";
            output.write(prompt);
        }

        // callback proxy
        function callback(password: string): void {
            var cb = self._callback;
            if (!cb) return;
            self._callback = null;
            process.nextTick(() => cb(password));
        };

        // resume normal behavior
        function finish(): void {
            self._state = State.Idle;
            self._keypress = null;
        }
        
        // custom keypress handler
        function keypress(s, key): void {
            var name;
            if (typeof key !== "undefined") {
                name = key.name;
                if (key.ctrl && !key.shift) {
                    switch (name) {
                        case 'c': // Ctrl+C (EOT)
                            finish();
                            return;
                        case 'd': // Ctrl+D (ETX)
                            if (password.length == 0) {
                                finish();
                            }
                            return;
                        case 'h': // Ctrl+H (BS = backspace)
                            key = { name: "backspace" };
                            break;
                        default:
                            return;
                    }
                }

                if (key.meta || key.ctrl) return;
            }

            switch (name) {
                case 'return': // CR
                case 'enter': // LF
                    finish();
                    output.write("\r\n");
                    callback(password);
                    break;
                case 'backspace':
                    if (password.length > 0) {
                        password = password.substring(0, password.length - 1);
                        if (!silent) output.write("\u0008 \u0008");
                    }
                    break;
                default:
                    if (typeof s === "string") {
                        var c = s[0];
                        if (c.charCodeAt(0) >= 0x20) {
                            if (!silent) output.write('*');
                            password += c;
                        }
                    }
                    break;
            }
        }
    }

    // writes a message to output
    write(message?: any, ...optionalParams: any[]): void {
        message = util.format.apply(this, arguments) + '\n';
        this._output.write(message);
    }

    // closes the console
    close(): void {
        this._state = State.Closed;
        if (this._readline) this._readline.close();
    }
}

// provides command context and context-specific functions
class CommandContext {
    private _shell: MiniShell;
    command: string;
    args: string[];
    options: {};

    constructor(shell: MiniShell, command: string, args: string[], options: {}) {
        this._shell = shell;
        this.command = command;
        this.args = args;
        this.options = options;
    }

    // execute another command with the specified arguments (unparsed)
    execute(command: string, ...args: string[]): void {
        if (!this._shell) return;
        var shell = <any>this._shell;
        this._shell = null;
        command = "" + command;
        if (!args) args = [];
        shell._execute(command, args);
    }

    // writes a message to output
    write(message?: any, ...optionalParams: any[]): void {
        if (!this._shell) return;
        this._shell.write.apply(this._shell, arguments);
    }

    // displays help
    help(): void {
        if (!this._shell) return;
        var shell = <any>this._shell;
        shell._help();
    }

    // ends the current command, making the shell prompt for another
    end(): void {
        if (!this._shell) return;
        var shell = <any>this._shell;
        this._shell = null;
        shell._next();
    }

    // displays an error message and ends the current command, making the shell prompt for another
    fail(err: Error|string): void
    fail(err: any): void {
        if (err.message) err = err.message;
        err = "" + err;
        this.write(err);
        this.end();
    }
}

// provides shell capabilities on top of MiniConsole
class MiniShell extends MiniConsole {
    private _commands: {};
    private _prompt: string;
    private _arglerOptions: {};

    constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream) {
        super(input, output);
        this._commands = {};
        this._prompt = "> ";
    }

    // declare a command (or multiple commands) with an optional help and action
    command(command: string|string[], action?: (info: minish.ICommandContext) => void): minish.IMiniShell
    command(command: string|string[], help?: string, action ?: (info: minish.ICommandContext) => void): minish.IMiniShell
    command(command: string|string[], help?: any, action?: (info: minish.ICommandContext) => void): minish.IMiniShell {
        if (action === undefined) {
            if (typeof help === "function") {
                action = <any>help;
                help = null;
            } else {
                action = null;
            }
        } else if (typeof action !== "function") {
            throw new TypeError("Function must be a function");
        }

        if (!Array.isArray(command)) command = <any>[command];
        (<string[]>command).forEach(command => {
            if (!command) {
                command = "";
            } else {
                command = "" + command;
            }

            if (command.length == 0) throw new Error("Empty command");

            this._commands[command] = action;
            if (help && command !== "_") (<any>action).help = help;
        });

        return this;
    }

    // sets the prompt and starts prompting for a command
    prompt(prompt?: string, options?: { ignoreBackslash?: boolean }): void {
        options = options || {};

        this._arglerOptions = {
            ignoreBackslash: options.ignoreBackslash,
        };

        this._command
        this._prompt = "" + (prompt || "> ");
        this._next();
    }

    // starts prompting for a command
    private _next(): void {
        super.question(this._prompt, { noSpace: true }, line => this._command(line));
    }

    // runs the specified command line
    private _command(line: string): void {
        // parse line into command and arguments using argler
        var args = argler(line, this._arglerOptions);
        var cmd = args.shift();
        this._execute(cmd, args);
    }

    // executes the specified command with unparsed arguments
    private _execute(cmd: string, args: string[]) {
        // parse arguments using minimist
        var options = minimist(args, { string: ['_'] });
        args = options._;
        if (args !== undefined) delete options._;

        // if the command was empty, prompt again
        if (!cmd || cmd.length == 0) return this._next();
    
        // run the command and/or report an error
        var action = this._commands[cmd];

        // all action-less commands map to "_" command
        if (action === null) action = this._commands["_"];

        if (typeof action === "function") {
            try {
                action.call(null, new CommandContext(this, cmd, args, options));
            } catch (err) {
                //TODO: add a configurable event handler
                super.write("Error:", err.message);
                this._next();
            }
        } else if (cmd == "help") {
            this._help();
            this._next();
        } else {
            super.write("Command '%s' not supported.", cmd);
            this._next();
        }
    }

    // displays help
    private _help(): void {
        var help = [];
        var padding = "";
        for (var command in this._commands) {
            if (command === "_") continue;
            if (!(<Object>this._commands).hasOwnProperty(command)) continue;
            help.push(command);
            while (padding.length <= command.length) padding += " ";
        }
        help.sort();
        help.forEach(command => {
            var h = (<any>this._commands[command]).help || "";
            super.write("%s %s%s", command, padding.slice(command.length - padding.length), h);
        });
    }
}

interface minish extends minish.IMiniShell {
    create(): minish.IMiniShell;
    create(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): minish.IMiniShell;
    exit(code ?: number): void;
}

declare module minish {

    export interface IMiniShell extends MiniShell {
    }

    export interface ICommandContext extends CommandContext {
    }

    export interface IQuestionOptions {
        noSpace?: boolean;
    }

    export interface IPasswordOptions extends IQuestionOptions {
        passwordChar?: string;
    }
}

// create a new instance of IMiniShell
function create(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): minish.IMiniShell {
    return new MiniShell(input, output);
}

// exits the whole process with an optional exit code
function exit(code ?: number): void {
    process.exit(code);
}

// create an instance of IMiniShell and export it
var minish = <minish>new MiniShell();
(<any>minish).parse = minimist;
(<any>minish).create = create;
(<any>minish).exit = exit;
export = minish;
