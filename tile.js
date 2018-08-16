const Util = require('./util');

class Tile {

    constructor(nes, data) {
        this.nes = nes;
        this.data = data;
        this.opaque = Util.fillArray(new Array(1)); // update this with a proper value
    }

    setScanline(x,y,z) {

    }
}

module.exports.Tile = Tile;