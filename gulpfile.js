var gulp = require('gulp'),
  mocha = require('gulp-mocha');



gulp.task('test', function() {
  return gulp.src('./test/**/*.test.js', {read: false})
    .pipe(mocha())
        .once('error', () => {
            process.exit(1);
        })
        .once('end', () => {
            process.exit();
        });
    
})


gulp.task('default');
