const jenkinsapi = require('jenkins-api');
const Promise = require('bluebird');

class Jenkins {
  constructor({url, logger, eventBus}) {
    this.logger = logger;
    this.eventBus = eventBus;
    // initialize jenkins api
    this._jenkins = jenkinsapi.init(url);
    this._cache = {
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
    };
  }


  allJobs(req, res) {
    this._computers()
      .then((data) => { res.json(data); })
      .catch((error) => {
        this.logger.warn(error);
        res.status(500).json({message: error.message});
      });
  }

  computers(req, res) {
    this._computers()
      .then((data) => { res.json(data); })
      .catch((error) => {
        this.logger.warn(error);
        res.status(500).json({message: error.message});
      });
  }

  _computers() {
    return Promise.fromCallback(this._jenkins.computers);
  }

  _allJobs() {
    return Promise.fromCallback(this._jenkins.all_jobs);
  }

  monitor() {
    this.eventBus.emit('status.now.init', this._cache);
    // check all computers every 10 seconds
    this._timerComputers = setInterval(() => {
      this._computers()
        .then((data) => {
          // winston.log('JENKINS: Got jenkins computers');
          this.eventBus.emit('status.now', {
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
        })
        .catch((error) => {
          clearInterval(this._timerComputers);
          this.logger.error(`jenkins.computers err2: ${error}`);
        });
    }, 30000);

    // check all jobs every 10 seconds
    this._timerAllJobs = setInterval(() => {
      this._allJobs()
        .then((data) => {
          // winston.log('JENKINS: Got jenkins jobs');
          const jobsStatus = {
            count: data.length,
            active: 0,
            failure: 0
          };
          _.each(data, (item) => {
            if (item.color === 'yellow') {
              jobsStatus.active += 1;
            }
            if (item.color === 'red') {
              jobsStatus.failure += 1;
            }
          });
          this.logger.silly(`jenkins.jobs: ${JSON.stringify(jobsStatus)}`);
          this.eventBus.emit('status.now', {jenkins: {jobs: jobsStatus}});
        })
        .catch((error) => {
          clearInterval(this._timerAllJobs);
          this.logger.error(error);
        });
    }, 20000);
  }
}

module.exports = Jenkins;
