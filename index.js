(() => {
    let NES = require('./nes');
    window.nes = new NES();

    console.log(window.nes)
})();