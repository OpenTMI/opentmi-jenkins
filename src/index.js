const {Addon, singleton} = require('opentmi-addon');
const _ = require('lodash');

const Jenkins = require('./jenkins');


class AddonJenkins extends Addon {
  constructor(...args) {
    super(...args);
    this._name = 'jenkins addon';
    this._description = 'Provide Jenkins integration';

    const options = {
      url: this.settings.url,
      logger: this.logger,
      eventBus: this.eventBus
    };
    if (!_.get(this.settings, 'url')) {
      throw new Error('Jenkins url not configured');
    }
    this._jenkins = new Jenkins(options);

    this.app.get('/api/v0/ci/jobs', this._jenkins.allJobs.bind(this._jenkins));
    this.app.get('/api/v0/ci/computers', this._jenkins.computers.bind(this._jenkins));
  }

  register() {
    this.logger.silly('registering jenkins addon');
    return Promise.resolve();
  }
  unregister() {
    return Promise.resolve();
  }
}

module.exports = singleton(AddonJenkins);
