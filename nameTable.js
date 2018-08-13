
/**
 * https://wiki.nesdev.com/w/index.php/PPU_nametables
 * A nametable is a 1024 byte area of memory used by the PPU to lay out backgrounds. 
 * Each byte in the nametable controls one 8x8 pixel character cell, 
 * and each nametable has 30 rows of 32 tiles each, for 960 ($3C0) bytes; 
 * the rest is used by each nametable's attribute table. With each tile being 8x8 pixels,
 * this makes a total of 256x240 pixels in one map, the same size as one full screen.
 */
class NameTable {
    /**
     * 
     * @param {object} nes the origin class instance for the application
     * @param {*} x 
     * @param {*} y 
     * @param {*} index 
     */
    constructor(nes, x, y, index) {
        this.nes = nes;
        this.x = x;
        this.y = y;
        this.index = index;
    }
}

module.exports.NameTable = NameTable;