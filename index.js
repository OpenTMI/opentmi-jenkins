var jenkinsapi = require('jenkins-api');
var winston = require('winston');
var nconf = require('nconf');
var _ = require('underscore');

function AddonJenkins (app, server, io, passport){

    this.name = 'jenkins addon';
    this.description = 'Provide Jenkins integration';
    var cfg = nconf.get('jenkins');
    
    this.register = function(){
        
        if( !cfg || !cfg.url ) {
          winston.error('jenkins url not configured!');
          return;
        }
        // initialize jenkins api
        var jenkins = jenkinsapi.init(cfg.url);

        global.pubsub.emit('status.now.init', {
          jenkins: {
            master: {
              alive: 0
            },
            slaves: { 
              active: 0,
              count: 0
            },
            jobs: {
              count: 0,
              active: 0   
            }
          }
        });
        
        app.get('/api/v0/ci/jobs', function(req, res){
          jenkins.all_jobs(function(err, data) {
            if (err){
              res.json(500, err); 
              return winston.error("jenkins.all_jobs err: "+err); 
            }
            res.json(data)
          });
        });
        app.get('/api/v0/ci/computers', function(req, res){
          jenkins.computers(function(err, data) {
            if (err){
              res.json(500, err); 
              return winston.error("jenkins.computers err1: "+err)
            }
            res.json(data)
          });
        });

        // check all computers every 10 seconds
        var timerComputers = setInterval( function(){
          jenkins.computers(function(err, data) {
            if (err) { 
                clearInterval(timerComputers);
                return winston.error("jenkins.computers err2: "+err);  
            }
            //winston.log('JENKINS: Got jenkins computers');
            global.pubsub.emit('status.now', {
              jenkins: {
                slaves: {
                  count: data.totalExecutors,
                  active: data.busyExecutors
                },
                master: {
                  alive: 1
                }
              }
            });
          });
        }, 10000);
        
        // check all jobs every 10 seconds
        setInterval( function(){
          var timerAllJobs = jenkins.all_jobs(function(err, data) {
              if (err){ 
                clearInterval(timerAllJobs);
                return winston.error(err); 
              }
              //winston.log('JENKINS: Got jenkins jobs');
              var jobsStatus = {
                  count: data.length,
                  active: 0,
                  failure: 0
              }
              _.each(data, function(item) { 
                if( item.color=='yellow') {
                    jobsStatus.active++
                }
                if( item.color=='red') {
                    jobsStatus.failure++
                }
              });
              console.log("jenkins.jobs: "+JSON.stringify(jobsStatus));
              global.pubsub.emit('status.now', { jenkins: { jobs: jobsStatus} } );
            });
        }, 10000);

    }
    return this;
}

exports = module.exports = AddonJenkins;