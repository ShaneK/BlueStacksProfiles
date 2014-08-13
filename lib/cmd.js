'use strict';

var exec = function(cmd, args, cb_stdout, cb_end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    me.exit = 0;  // Send a cb to set 1 when cmd exits
    me.stdout = "";
    child.stdout.on('data', function (data) {
        me.stdout += data.toString();
        if(cb_stdout){
            cb_stdout(me, data);
        }
    });
    child.stdout.on('end', function () {
        me.exit = 1;
        if(cb_end){
            cb_end(me);
        }
    });
};

var taskkill = function(process, cb_out, cb_end){
    new exec('taskkill', ['/F', '/im', process], cb_out, cb_end);
};

exports.exec = exec;
exports.taskkill = taskkill;
