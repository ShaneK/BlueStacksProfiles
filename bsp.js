#!/usr/bin/env node

'use strict';

var cmd = require('./lib/cmd.js'),
    Promise = require('bluebird'),
    fsx = require('fs-extra'),
    fs = require('fs'),
    config = require('./config.json'),
    prompt = require('prompt');

var killBluestacks = function(cb){
    var promises = [];

    promises.push(new Promise(function(resolve){
        cmd.taskkill('HD-Service.exe', null, resolve);
    }));

    promises.push(new Promise(function(resolve){
        cmd.taskkill('HD-Agent.exe', null, resolve);
    }));

    promises.push(new Promise(function(resolve){
        cmd.taskkill('HD-Frontend.exe', null, resolve);
    }));

    promises.push(new Promise(function(resolve){
        cmd.taskkill('HD-RunApp.exe', null, resolve);
    }));

    promises.push(new Promise(function(resolve){
        cmd.taskkill('HD-LogRotatorService.exe', null, resolve);
    }));

    promises.push(new Promise(function(resolve){
        cmd.taskkill('HD-UpdaterService.exe', null, resolve);
    }));

    Promise.settle(promises).done(function(){
        if(!fs.existsSync(config.sterile)){ //First time running?
            fsx.ensureDir(config.sterile);
            fsx.copySync(config.bluestacks+config.dataname, config.sterile+config.dataname);
        }
        fsx.ensureDir(config.profiles);
        if(cb){
            cb(arguments);
        }
    });
};

var launchBluestacks = function(){
    cmd.exec(config.launcher);
};

var changeProfile = function(newProfile, cb){
    killBluestacks(function(){
        //First: Back up current profile
        if(fs.existsSync(config.bluestacks+config.dataname+'/current_profile.txt')){
            var oldProfile = fs.readFileSync(config.bluestacks+config.dataname+'/current_profile.txt').toString();
            if(oldProfile == newProfile){
                console.error("This is the profile currently in use.");
                if(cb){
                    cb();
                }
                return;
            }
            fsx.copySync(config.bluestacks+config.dataname, config.profiles+'/'+oldProfile);
        }

        //Then: Take data from new profile and put it into data folder
        if(!fs.existsSync(config.profiles+'/'+newProfile)){
            console.error("Profile", newProfile, "does not exist.");
            return;
        }
        fsx.copySync(config.profiles+'/'+newProfile, config.bluestacks+config.dataname);
        if(cb){
            cb();
        }
    });
};

var newProfile = function(newProfile, cb){
    killBluestacks(function(){
        var newProfilePath = config.profiles+'/'+newProfile;
        if(fs.existsSync(newProfilePath)){
            console.error("The profile", newProfile, "already exists.");
            changeProfile(newProfile, cb);
            return;
        }
        fsx.copySync(config.sterile+config.dataname, newProfilePath);
        fs.writeFileSync(newProfilePath + '/current_profile.txt', newProfile);
        changeProfile(newProfile, cb);
    });
};

var deleteFolderRecursive = function(path) {
    var files = [];
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        for(var i = 0, ii = files.length; i < ii; i++){
            var curPath = path + "/" + files[i];
            if(fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(path);
    }
};

var deleteProfile = function(profileName){
    killBluestacks(function(){
        var oldProfilePath = config.profiles+'/'+profileName;
        if(!fs.existsSync(oldProfilePath)){
            console.error("The profile", profileName, "does not exist.");
            return;
        }
        if(fs.existsSync(config.bluestacks+config.dataname+'/current_profile.txt')){
            var currentProfile = fs.readFileSync(config.bluestacks+config.dataname+'/current_profile.txt').toString();
            if(currentProfile == profileName){
                fs.unlinkSync(config.bluestacks+config.dataname+'/current_profile.txt');
            }
        }
        deleteFolderRecursive(oldProfilePath);
    });
};

var listProfiles = function(){
    fs.readdir(config.profiles, function(err, directory){
        if(err){
            console.error("Error:", err);
            return;
        }
        console.log("Current profiles:");
        for(var i = 0, ii = directory.length; i < ii; i++){
            console.log("\t",directory[i]);
        }
    });
};

var profileExists = function(name){
    var dir = fs.readdirSync(config.profiles);
    return dir.indexOf(name) !== -1;
};

var args = process.argv.splice(2);
for(var i = 0, ii = args.length; i < ii; i++){
    var nextArg = args[i+1];
    switch(args[i]){
        case '-n':
        case '--new':
            if(nextArg){
                newProfile(nextArg, launchBluestacks);
            }
            break;
        case '-c':
        case '--change':
            if(nextArg){
                changeProfile(nextArg, launchBluestacks);
            }
            break;
        case '-k':
        case '--kill':
            killBluestacks();
            break;
        case '-d':
        case '--delete':
            if(nextArg){
                deleteProfile(nextArg);
            }
            break;
        case '-l':
        case '--list':
            listProfiles();
            break;
        case '-?':
        case '--help':
            var helpString = "Bluestacks Profile Manager v"+require('./package.json').version+"\n\
Usage: bsp [options] [profile name]\n\
\n\
options:\n\
\t-n, --new\tcreate new profile [profile name]\n\
\t-l, --list\tlists all current Bluestacks profiles\n\
\t-c, --change\tchange to profile [profile name]\n\
\t-d, --delete\tdelete profile [profile name]\n\
\t-k, --kill\tkill all bluestacks-related processes\n\
\t-?, --help\tbrings up this information\n\n\
If a single argument is passed in and it is not a recognized option, it will act as if you passed in -c and try to change to a profile with the name of the argument.\n";
            console.log(helpString);
            break;
        default:
            if(args.length === 1){
                if((profileExists(args[i]))){
                    changeProfile(args[i], launchBluestacks);
                }else{
                    console.log('"' + args[i] + '"', 'is neither a command or a profile name. To see available commands use the -? or --help argument.');
                }
            }
            break;
    }
}
