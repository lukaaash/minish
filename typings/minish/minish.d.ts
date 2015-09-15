// Type definitions for minish 0.5.0
// Project: https://github.com/lukaaash/minish
// Definitions by: Lukas Pokorny <https://github.com/lukaaash>

/// <reference path="../node/node.d.ts" />

declare module "minish" {

    // additional functions exported by default shell
    interface minish extends minish.IMiniShell {
        // create a new instance of IMiniShell
        create(): minish.IMiniShell;
        create(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): minish.IMiniShell;

        // exits the whole process with an optional exit code
        exit(code?: number): void;
    }

    module minish {

        // provides simple shell capabilities
        export interface IMiniShell {

            // asks a question and calls the supplied function when it is answered
            question(prompt: string, options?: minish.IQuestionOptions, callback?: (reply: string) => void): void;

            // asks for a password and calls the supplied function when done
            password(prompt: string, options?: minish.IPasswordOptions, callback?: (password: string) => void): void;

            // writes a message to output
            write(message?: any, ...optionalParams: any[]): void;

            // closes the shell
            close(): void;

            // writes a message to output
            write(message?: any, ...optionalParams: any[]): void;

            // sets the prompt and starts prompting for a command
            prompt(prompt?: string): void;

            // declare a command (or multiple commands) with an optional help and action
            command(command: string | string[], action?: (info: ICommandContext) => void): IMiniShell;
            command(command: string | string[], help?: string, action?: (info: ICommandContext) => void): IMiniShell;

            // closes the console
            close(): void;
        }

        // options for 'question' function
        export interface IQuestionOptions {
            noSpace?: boolean;
        }

        // options for 'password' function
        export interface IPasswordOptions extends IQuestionOptions {
            passwordChar?: string;
        }

        // provides command context and context-specific functions
        export interface ICommandContext {
            // invoked command
            command: string;

            // arguments (parsed with minimist)
            args: string[];

            // options (parsed with minimist)
            options: {};

            // execute another command with the specified arguments (unparsed)
            execute(command: string, ...args: string[]): void;

            // writes a message to output
            write(message?: any, ...optionalParams: any[]): void;

            // displays help
            help(): void;

            // ends the current command, making the shell prompt for another
            end(): void;

            // displays an error message and ends the current command, making the shell prompt for another
            fail(err: any): void;
        }
    }

    var minish: minish;
    export = minish;
}
