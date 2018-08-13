/**
 * https://wiki.nesdev.com/w/index.php/Mapper
 * The term mapper may refer to three separate things, 
 * all of which relate to the mapping, or translation,
 * of the graphical (CHR) and program (PRG) ROMs or RAMs and nametables into the CPU's and PPU's address spaces:
 */
class Mapper {
    constructor(nes) {
        this.nes = nes;
    }
    load() {

    }

    /**
     * I am not able to find any documentation for this. What is a mapper latch? 
     * @param {number} address 
     */
    latchAccess(address) {

    }
}


module.exports = Mapper;
