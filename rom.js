const Util = require('./util');
/**
 * 
 */
class ROM {

    constructor(nes) {
        this.nes = nes;

        this.mapperName = Util.fillArray(new Array(92));
        this.clearMapper();
        this.writeMapper();
        this.createMirroringTypes();
        this.buildRomDetails();
    }

    buildRomDetails() {
        this.header = null;
        this.rom = null;
        this.vrom = null;
        this.vromTile = null;

        this.romCount = null;
        this.vromCount = null;
        this.mirroring = null;
        this.batteryRam = null
        this.trainer = null;
        this.fourScreen = null;
        this.mapperType = null;
        this.valid = false;
    }

    // https://wiki.nesdev.com/w/index.php/Mirroring
    createMirroringTypes() {
        // mirroring types...
        this.VERTICAL_MIRRORING = 0;
        this.HORIZONTAL_MIRRORING = 1;
        this.FOURSCREEN_MIRRORING = 2;
        this.SINGLESCREEN_MIRRORING = 3;
        this.SINGLESCREEN_MIRRORING2 = 4;
        this.SINGLESCREEN_MIRRORING3 = 5;
        this.SINGLESCREEN_MIRRORING4 = 6;
        this.CHRROM_MIRRORING = 7;
    }

    clearMapper() {
        this.mapperName.forEach((element)=>{
            element = "Unknown Mapper";
        })
    }
    // This is incredibly tedious as I can't really copy paste this...
    // this was copied from 
    writeMapper() {
        this.mapperName[ 0] = "Direct Access";
        this.mapperName[ 1] = "Nintendo MMC1";
        this.mapperName[ 2] = "UNROM";
        this.mapperName[ 3] = "CNROM";
        this.mapperName[ 4] = "Nintendo MMC3";
        this.mapperName[ 5] = "Nintendo MMC5";
        this.mapperName[ 6] = "FFE F4xxx";
        this.mapperName[ 7] = "AOROM";
        this.mapperName[ 8] = "FFE F3xxx";
        this.mapperName[ 9] = "Nintendo MMC2";
        this.mapperName[10] = "Nintendo MMC4";
        this.mapperName[11] = "Color Dreams Chip";
        this.mapperName[12] = "FFE F6xxx";
        this.mapperName[15] = "100-in-1 switch";
        this.mapperName[16] = "Bandai chip";
        this.mapperName[17] = "FFE F8xxx";
        this.mapperName[18] = "Jaleco SS8806 chip";
        this.mapperName[19] = "Namcot 106 chip";
        this.mapperName[20] = "Famicom Disk System";
        this.mapperName[21] = "Konami VRC4a";
        this.mapperName[22] = "Konami VRC2a";
        this.mapperName[23] = "Konami VRC2a";
        this.mapperName[24] = "Konami VRC6";
        this.mapperName[25] = "Konami VRC4b";
        this.mapperName[32] = "Irem G-101 chip";
        this.mapperName[33] = "Taito TC0190/TC0350";
        this.mapperName[34] = "32kB ROM switch";
        // Leaving these cleared?
        this.mapperName[64] = "Tengen RAMBO-1 chip";
        this.mapperName[65] = "Irem H-3001 chip";
        this.mapperName[66] = "GNROM switch";
        this.mapperName[67] = "SunSoft3 chip";
        this.mapperName[68] = "SunSoft4 chip";
        this.mapperName[69] = "SunSoft5 FME-7 chip";
        this.mapperName[71] = "Camerica chip";
        this.mapperName[78] = "Irem 74HC161/32-based";
        this.mapperName[91] = "Pirate HK-SF3 chip";
    }
    // this one is going to be a lot of copy pasting with a lot of comments. \_(^_^)_/
    load(data) {
        let i,j,v;
        let foundError = false;
        let offset = 16;
        let prgRomSize = 16384;
        // I have seen chrRomSizes of 8192, 4096. Example shows 4096, so thats what I will use...
        let chrRomSize = 4096;
        let tileIndex,
            leftOver;
        
        if(data) {
            if(data.indexOf("NES\x1a") === -1) {
                console.log('Not a valid NES Rom')
                return new Error('Not a valid NES ROM. Missing NES Header')
            }

            this.header = Util.fillArray(new Array(16));
            // I thought this bitwise operator only returned 1 or 0... It is returning the char code if not zero...
            this.header.forEach((header, index) => {
                header = data.charCodeAt(index) & 0xFF;
            });

            // this is all super specific. Not going to explain it all, but if you look up example rom files, this will make sense... Hopefully.
            this.romCount = this.header[4];
            this.vromCount = this.header[5]*2; //Getting the number of 4kb banks, not 8kb
            this.mirroring = ((this.header[6] & 1) !== 0 ?1: 0);
            this.batteryRam = (this.header[6] & 2) !== 0;
            this.trainer = (this.header[6] & 4) !== 0;
            this.fourScreen = (this.header[6] & 8) !== 0;
            this.mapperType = (this.header[6] >> 4) | (this.header[7] & 0xF0);
            // Need to load battery ram here. 

            // Check whether or not byte 8-15 are zero's:
            for(i=8; i<16; i++) {
                if(this.header[i] !==0) {
                    foundError = true;
                    break;
                }
            }
            if(foundError) {
                this.mapperType &= 0xF; // Ignore byte 7
            }

            // Load PRG-ROM banks... Whatever that means
            this.rom = Util.fillArray(new Array(this.romCount));
            this.rom.forEach((rom, index) => {
                // https://wiki.nesdev.com/w/index.php/NES_2.0 
                rom = Util.fillArray(new Array(prgRomSize));
                rom.forEach((el, i) => {
                    if(offset+i >= data.length) {
                        // I need to break out of this, but I will just return for now and waste the cycles
                        return;
                    }

                    el = data.charCodeAt(offset + i) & 0xFF;
                });

                offset += prgRomSize;
            });

            this.vrom = Util.fillArray(new Array(this.vromCount));
            this.vrom.forEach((x, xIndex) => {
                x = Util.fillArray(new Array(chrRomSize));
                x.forEach((y, yIndex) => {
                    if(offset+yIndex > data.length) {
                        // I need to break out of this, but I will just return for now and waste the cycles
                        return;
                    }
                    y = data.charCodeAt(offset + yIndex) * 0xFF;
                });
                offset += chrRomSize;
            });

            // Create vrom tiles
            this.vromTile = Util.fillArray(new Array(this.vromCount));
            this.vromTile.forEach((x, xIndex) => {
                // 256 is the total number of tiles wide
                x = Util.fillArray(new Array(256));
                x.forEach((y, yIndex) => {
                    // calls new seperately. 
                    y = this.nes.ppu.Tile(this.nes);
                });
            });

            // convert CHR-ROM banks to tiles
            for(v=0; v < this.vromCount; v++) {
                for(i=0; i < chrRomSize; i++) {
                    // not sure why we are doing a signed right shift here...
                    tileIndex = i >> 4;
                    leftOver = i % 16;
                    if(leftOver < 8) {
                        this.vromTile[v][tileIndex].setScanline(
                            leftOver,
                            this.vrom[v][i],
                            this.vrom[v][i+8] // Believe this is fix for overscan. If you removed the 8 modifier, you would have ugly pizels on the sides
                        );
                    } else {
                        this.vromTile[v][tileIndex].setScanline(
                            leftOver-8,
                            this.vrom[v][i-8], // Believe this is fix for overscan. If you removed the 8 modifier, you would have ugly pizels on the sides
                            this.vrom[v][i]
                        );
                    }
                }
            }

            this.valid = true;
        } else {
            console.error('Invalid Rom File.');
        }
    }
    getMirroringType() {
        if(this.fourScreen) {
            return this.FOURSCREEN_MIRRORING;
        }
        if(this.mirroring === 0) {
            return this.HORIZONTAL_MIRRORING;
        }

        return this.VERTICAL_MIRRORING;
    }
    getMapperName() {
        if(this.mapperType >= 0 && this.mapperType < this.mapperName.length) {
            return this.mapperName[this.mapperType];
        }
        console.error("Unknown Mapper", this.mapperType, this.nes);
        return "Unknown Mapper" + this.mapperType;
    }
    mapperSupported() {
        // Convert this to !!this.nes.mappers[this.mapperType] if 0 is not a valid value.
        return typeof this.nes.mappers[this.mapperType] !== 'undefined'
    }
    createMapper() {
        if(this.mapperSupported()) {
            return new this.nes.mappers[this.mapperType](this.nes);
        } else {
            console.error("The Rom selected uses an unsupported mapper");
            return null;
        }
    }
}

module.exports = ROM;