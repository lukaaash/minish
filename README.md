minish
======

Minish makes it easy to write applications that interact with a user using a simple shell-like command-line interface.

## Installing

```shell
$ npm install --save minish
```

## Usage

Starting an interactive command-line session is very simple. Just *require* minish, declare some commands and start a command prompt:

```javascript
var shell = require('minish');

// 'hello' command
shell.command("hello", function (context) {

    // display something
	shell.write("Hello world!");

	// make sure to end each command properly
    context.end();
});

shell.command("exit", function (context) {

    // exit the application
    shell.exit();
});

// start prompting for commands
shell.prompt();
```

Commands accept arguments and options. Both of these get parsed with [minimist](https://www.npmjs.com/package/minimist) and are passed to the callback with *command context* object:

```javascript
shell.command("echo", function (context) {
    // retrieve command arguments and options (parsed with minimist)
    var args = context.args;
    var opts = context.options;

    // show arguments
    shell.write(args, opts);

    // end the command
    context.end();
});
```

Minish makes it simple to ask for input. It can also ask for passwords discretely:

```javascript
// ask for a password without revealing its characters:
shell.password("Type a secret password:", function (password) {

    // ask whether to show the password
    shell.question("Type 'show' to display the password:", function (reply) {

        // show the password if needed
        if (reply === "show") shell.write("The password was:", password);
    });
});
```

Let's try something more complicated:

```javascript
shell = require('minish');

// 'hello' command
shell.command("hello", function (context) {
    // write to shell's output (the console by default)
    shell.write("Hello world!");

    // end the command
    context.end();
});

// 'echo' command
shell.command("echo", "Shows arguments and options", function (context) {
    // retrieve command arguments and options (parsed with minimist)
    var args = context.args;
    var opts = context.options;

    // show arguments
    shell.write(args, opts);

    // end the command
    context.end();
});

// 'ask' command
shell.command("ask", "Asks a question", function (context) {

    // ask a question and await answer
    shell.question("What's your name?", function (reply) {

        // show reply
        shell.write("Your name is:", reply);

        context.end();
    });
});

// 'passwd' command
shell.command("passwd", "Asks for a password without revealing its characters", function (context) {

    // aks for a password
    shell.password("Type a secret password:", function (password) {

        // ask whether to show the password
        shell.question("Type 'show' to display the password:", function (reply) {

            // show the password if needed
            if (reply === "show") shell.write("The password was:", password);

            context.end();
        });
    });
});

// 'quit' and 'exit' commands
shell.command(["quit", "exit"], "Exits the example", function (context) {
    shell.write("Ending...");
    shell.exit();
});

// override default 'command not supported' handler
shell.command("_", function (context) {
    context.fail("Command '" + context.command + "' not supported");
});

// display a welcome message
shell.write("Welcome to minish.");
shell.write("Type 'help' to see a list of available commands.");

// start prompting for commands
shell.prompt("> ");
```

