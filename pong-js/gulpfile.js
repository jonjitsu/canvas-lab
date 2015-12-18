'use strict';

var gulp = require('gulp'),
    del = require('del'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    replace = require('gulp-replace'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    browserSync = require('browser-sync').create(),
    minifyCss = require('gulp-minify-css'),
    concatCss = require('gulp-concat-css'),
    size = require('gulp-size'),
    util = require('gulp-util'),
    eslint = require('gulp-eslint');

gulp.task('default', ['build']);

gulp.task('build', ['lint']);

gulp.task('lint', function(){
    var options = {
        configFile: 'eslintrc.yml'
    };
    return gulp.src(['public/js/**/*.js'])
        .pipe(eslint(options))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('serve', ['lint'], function() {
    browserSync.init({
        server: './public',
        files: ['public/**/*'],
        open: false
    });

    gulp.watch('public/js/*.js', ['lint']);
});

gulp.task('test', function() {
    util.log('@TODO');
});
