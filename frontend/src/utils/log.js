const log = {
  debug: (message) => {
    console.debug(`[${new Date().toISOString()}] DEBUG: ${message}`);
  }
};

export default log;
