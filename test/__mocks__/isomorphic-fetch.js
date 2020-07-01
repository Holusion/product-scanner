

const fetch = jest.fn();
global.fetch = fetch;
module.exports = fetch;