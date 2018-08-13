/**
 * https://bytes.vokal.io/7-nes-ppu/
 * Palette tables live in 0x3F00 - 0x3F20 in VRAM, and are mirrored all the way up to 0x4000. 
 * The palettes are broken up into two separate tables. 
 * Background palettes are located in 0x3F00 - 0x3F0C, and sprite palettes are in 0x3F10 - 0x3F1C
 */
class PaletteTable {

    constructor(nes) {
        this.nes = nes;
    }

    /**
     * 
     * @param {boolean} f_color color flag in PPU.js
     * only ever called from updateControlReg2
     */
    setEmphasis(f_color) {

    }

    loadDefaultTable() {

    }

    loadNTSCPalette() {

    }
}

module.exports.PaletteTable = PaletteTable;