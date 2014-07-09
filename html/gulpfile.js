
var gulp = require('gulp');

var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var rev = require('gulp-rev');
var del = require('del');

var BUILD_DIR = '../build/';

gulp.task('clean', function() {
    del([BUILD_DIR], {force:true});
});

gulp.task('usemin', function() {
    gulp.src('index.html')
        .pipe(usemin({
            css: [minifyCss(), 'concat'],
            html: [minifyHtml({empty: true})],
            js: [uglify(), rev()]
        }))
        .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy_static', function() {
    gulp.src('generated/**')
        .pipe(gulp.dest(BUILD_DIR + 'generated/'));

    gulp.src('media/**')
        .pipe(gulp.dest(BUILD_DIR + 'media/'));

    gulp.src('lib/font-awesome/fonts/**')
        .pipe(gulp.dest(BUILD_DIR + 'fonts/'));
});

gulp.task('default', ['clean', 'usemin', 'copy_static']);

