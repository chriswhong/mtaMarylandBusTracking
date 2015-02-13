if (process.env.NODE_ENV === 'test'){
  module.exports = require('./test/config');
  return;
}

module.exports = {
  mongo_url: process.env.MONGOLAB_URI || 'mongodb://localhost:27017/gtfs',
  agencies: [
    'maryland-transit-administration'
  ]
};
