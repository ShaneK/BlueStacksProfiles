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
            fsx.copySync(config.bluestacks+config.dataname, config.sterile+config.dataname, function(err){
                if(err){
                    console.error(err);
                }
            });
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

var args = process.argv.splice(2);
for(var i = 0, ii = args.length; i < ii; i++){
    var nextArg = args[i+1];
    switch(args[i]){
        case '-c':
            if(nextArg){
                changeProfile(nextArg, launchBluestacks);
            }
            break;
        case '-create':
            if(nextArg){
                changeProfile(nextArg, launchBluestacks);
            }
            break;
        case '-n':
            if(nextArg){
                newProfile(nextArg, launchBluestacks);
            }
            break;
        case '-new':
            if(nextArg){
                newProfile(nextArg, launchBluestacks);
            }
            break;
        case '-k':
            killBluestacks();
            break;
        case '-kill':
            killBluestacks();
            break;
        case '-d':
            if(nextArg){
                deleteProfile(nextArg);
            }
            break;
        case '-delete':
            if(nextArg){
                deleteProfile(nextArg);
            }
            break;
        default:
            if(args.length === 1){
                changeProfile(args[i], launchBluestacks);
            }
            break;
    }
}
