var jenkinsapi = require('jenkins-api');
var winston = require('winston');
var nconf = require('nconf');

function AddonJenkins (app, server, io, passport){

  this.name = 'jenkins addon';
  this.description = 'Provide Jenkins integration';
  this.listDependencies = ['jenkins-api'];
  
	this.register = function(){
    var jenkins_cfg = nconf.get('jenkins')
    if( !jenkins_cfg || !jenkins_cfg.url ) {
      winston.error('jenkins url not configured!');
      return;
    }
		var jenkins = jenkinsapi.init(nconf.get('jenkins').url);
    
    app.get('/api/v0/ci/jobs', function(req, res){
      jenkins.all_jobs(function(err, data) {
        if (err){
          res.json(500, err); 
          return winston.error(err); 
        }
        res.json(data)
      });
    });
    app.get('/api/v0/ci/computers', function(req, res){
      jenkins.computers(function(err, data) {
        if (err){
          res.json(500, err); 
          return console.log(err); 
        }
        res.json(data)
      });
    });

    setInterval( function(){
      jenkins.computers(function(err, data) {
        if (err) { return console.log(err);  }
        console.log('Got jenkins computers');
        global.pubsub.emit('jenkins.computers', data);
      });
    }, 10000);
    setInterval( function(){
      jenkins.all_jobs(function(err, data) {
          if (err){ 
            return winston.error(err); 
          }
          console.log('Got jenkins jobs');
          global.pubsub.emit('jenkins.jobs', data);
        });
    }, 10000);

	}
  return this;
}

exports = module.exports = AddonJenkins;