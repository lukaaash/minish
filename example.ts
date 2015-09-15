import shell = require('./index');
//import shell = require('minish');
//var shell = require('minish');

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
