var gulp = require('gulp');
var ts = require('gulp-typescript');
var jeditor = require("gulp-json-editor");

var project = ts.createProject({
    "declarationFiles": false,
    "noExternalResolve": true,
    "module": "commonjs",
});

var tsWeb = ts.createProject({
    "declarationFiles": false,
    "noExternalResolve": true,
    "sortOutput": true,
});

var src = {
    lib: ['*.ts', 'typings/*/*.d.ts'],
    pkg: ['package.json'],
    npm: ['.npmignore', 'README.md', 'LICENSE'],
};

var out = {
    lib: 'build',
};

gulp.task('lib', function () {
    return gulp.src(src.lib)
        .pipe(ts(project))
        .pipe(gulp.dest(out.lib));
});

gulp.task('package', function () {
    return gulp.src(src.pkg)
        .pipe(jeditor({ 'devDependencies': undefined }))
        .pipe(gulp.dest(out.lib));
});

gulp.task('npm', function () {
    return gulp.src(src.npm)
        .pipe(gulp.dest(out.lib));
});

gulp.task('build', ['lib', 'package', 'npm'], function () {
});

gulp.task('default', ['build'], function () {
});
