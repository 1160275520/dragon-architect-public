
var gulp = require('gulp');

var useref = require('gulp-useref');
var debug = require('gulp-debug');
var lazypipe = require('lazypipe');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var preprocess = require('gulp-preprocess');
var rev = require('gulp-rev');
var rimraf = require('rimraf');

var argv = require('minimist')(process.argv.slice(2));
console.log(argv);

var BUILD_DIR = __dirname + '/../dist/';

gulp.task('clean', function(cb) {
    rimraf(BUILD_DIR, cb);
});

var handle_js = lazypipe()
    .pipe(preprocess, {context: argv})
    .pipe(uglify);

gulp.task('usemin_index', ['clean'], function() {
    return gulp.src('index.html')
        .pipe(preprocess({context: argv}))
        .pipe(useref())
        .pipe(gulpif('*.js', handle_js()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(gulpif('*.html', minifyHtml({empty: true})))
        .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('usemin_frame', ['clean'], function() {
    return gulp.src(['frame.html'])
        .pipe(preprocess({context: argv}))
        .pipe(useref())
        .pipe(gulpif('*.js', handle_js()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(gulpif('*.html', minifyHtml({empty: true})))
        .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy_generated', ['clean'], function() {
    return gulp.src(['generated/*.js'])
        .pipe(gulp.dest(BUILD_DIR + 'generated/'));
});

gulp.task('copy_media', ['clean'], function() {
    return gulp.src(['media/**'])
        .pipe(gulp.dest(BUILD_DIR + 'media/'));
});

gulp.task('copy_content', ['clean'], function() {
    return gulp.src('content/**')
        .pipe(gulp.dest(BUILD_DIR + 'content/'));
});

gulp.task('copy_fonts', ['clean'], function() {
    return gulp.src('lib/font-awesome/fonts/**')
        .pipe(gulp.dest(BUILD_DIR + 'fonts/'));
});

gulp.task('copy_static', ['copy_generated', 'copy_media', 'copy_content', 'copy_fonts']);

gulp.task('default', ['usemin_index', 'usemin_frame', 'copy_static']);

