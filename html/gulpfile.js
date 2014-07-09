
var gulp = require('gulp');

var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var rev = require('gulp-rev');
var rimraf = require('rimraf');

var BUILD_DIR = __dirname + '/../build/';

gulp.task('clean', function(cb) {
    rimraf(BUILD_DIR, cb);
});

gulp.task('usemin', function() {
    return gulp.src('index.html')
        .pipe(usemin({
            css: [minifyCss(), 'concat'],
            html: [minifyHtml({empty: true})],
            js: [uglify()]
        }))
        .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy_generated', function() {
    return gulp.src(['generated/**', '!generated/README*'])
        .pipe(gulp.dest(BUILD_DIR + 'generated/'));
});

gulp.task('copy_media', function() {
    return gulp.src(['media/**'])
        .pipe(gulp.dest(BUILD_DIR + 'media/'));
});

gulp.task('copy_fonts', function() {
    return gulp.src('lib/font-awesome/fonts/**')
        .pipe(gulp.dest(BUILD_DIR + 'fonts/'));
});

gulp.task('copy_static', ['copy_generated', 'copy_media', 'copy_fonts']);

gulp.task('default', ['usemin', 'copy_static']);

