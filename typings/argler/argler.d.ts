// Type definitions for argler 1.0.1
// Project: https://github.com/lukaaash/argler
// Definitions by: Lukas Pokorny <https://github.com/lukaaash>

declare module 'argler' {
    function argler(commandline: string, options?: { ignoreBackslash?: boolean }): string[];

    export = argler;
} 
