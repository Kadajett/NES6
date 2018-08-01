(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(()=>{
    class CPU {
        constructor (nes) {
            this.nes = nes;

            // Memory
            // ==========
            // 0x100 => Zero page
            // 0x200 => Stack
            
            /*
            * The available memory space for our nes
            */
            this.memory = Array(0x10000);

            // Registers
            // Program Counter PC (16 bit)
            this.pc = null;

            // Stack Pointer (8 bit)
            this.sp = null;

            // Accumulator (8 bit)
            this.a = null;

            // Index Register X (8 bit)
            this.x = null;

            // Index Register Y (8 bit)
            this.y = null;

            // Processor Status (How does this relate to the boolean party below? Maybe 1000010?)
            // 0 => Carry (If last instruction resulted in under/overflow)
            // 1 => Zero (If last instructions result was 0)
            // 2 => Interrupt Disable (Enable to prevent system, from responding to interrupts)
            // 3 => Decimal Mode (Not supported on this chip variant, so basically unused)
            // 4 => Empty
            // 5 => Empty
            // 6 => Overflow (if previous instruction resulted in an invalid two's compliment)
            // 7 => Negative
            this.p = null;

            // Part of the Processor Status register
            this.carryFlag = false;
            this.zeroFlag = false;
            this.interruptDisable = false;
            this.decimalModeFlag = false;
            this.breakCommand = false;
            this.overflowFlag = false;
            this.negativeFlag = false;

            // Maskable Interrupt
            this.interrupt = null;

            this.addressingMode = {
                ZERO_PAGE: 0,
                INDEXED_ZERO_PAGE_X: 1,
                INDEXED_ZERO_PAGE_Y: 2,
                ABSOLUTE: 3,
                INDEXED_ABSOLUTE_X: 4,
                INDEXED_ABSOLUTE_y: 5,
                IMPLIED: 6,
                ACCUMULATOR: 7,
                IMMEDIATE: 8,
                RELATIVE: 9,
                INDEXED_INDIRECT: 10,
                INDIRECT_INDEXED: 11,
                INDIRECT: 12
            };

            this.operations = {};

            this.reset();
        }

        getResetVector () {
            return null;
        }

        reset () {
            
            this.memory = Array(0x10000);

            this.carryFlag = false;
            this.zeroFlag = false;
            this.interruptDisable = true;
            this.decimalModeFlag = false;
            this.breakCommand = false;
            this.overflowFlag = false;
            this.negativeFlag = false;

            try {
                if(this.nes && this.nes.program) {
                    let programRom = this.nes.program.getPrgRom();
                }
            } catch (err) {
                console.error(err);
            }

            let i;

            for(i = 0; i <= 0x2000; i++) {
                this.memory[i] = 0xFF
            }
            for(i = 0x2000; i <= 0x8000; i++) {
                this.memory[i] = 0;
            }

            this.pc = this.getResetVector();

            this.sp = 0xFD;

            this.a = this.x = this.y = 0;

            this.p = this.getProcessorFlags();
        }

        getProcessorFlags() {
            return +this.carryFlag | +this.zeroFlag << 1 | +this.interruptDisable << 2 | +this.decimalModeFlag << 3 | +this.breakCommand << 4 | 0x20 | +this.overflowFlag << 6 | +this.negativeFlag << 7;
        }

        getResetVector() {
            return this.loadMemory(0xFFFC, true)
        }

        /**
         * 
         * @param {number} address In HEX, the memory location requested to load
         * @param {boolean} double Optional double read for 2 byte  
         */
        loadMemory(address, double) {
            if(!double) {
                return this.nes.mapper.load(address);
            }       
            return this.nes.mapper.load(address) | (this.nes.mapper.load(address + 1) << 8);
        }
    }

    module.exports = CPU;
})()
},{}],2:[function(require,module,exports){
(() => {
    let NES = require('./nes');
    window.nes = new NES();

    console.log(window.nes)
})();
},{"./nes":4}],3:[function(require,module,exports){
class Mapper {
    constructor(nes) {
        this.nes = nes;
    }
    load() {

    }
}


module.exports = Mapper;

},{}],4:[function(require,module,exports){
'use strict';

const CPU = require('./cpu');
const Program = require('./program');
const Mapper = require('./mapper');
const ROM = require('./rom');
const PPU = require('./ppu');


class NES {
        constructor() {
            this.isRunning = false;
            this.fpsFrameCount = 0;
            this.fpsInterval = 500;
            this.limitFrames = true;
            this.romData = null;
            this.program = new Program(this);
            this.mapper = new Mapper(this);
            this.cpu = new CPU(this);
            this.rom = new ROM(this);
            this.ppu = new PPU(this);
            // this.program = null;
        }

        loadProgram (data) {
            this.program = new Program(this);
            this.program.load(data);
            this.reset();
        }

        start() {
            if(this.rom !== null && this.rom.valid) {
                if(!this.isRunning) {
                    this.isRunning = true;

                    this.frameInterval = setInterval(() => {
                        this.frame();
                    }, this.fpsInterval / 2);

                    this.resetFPS();
                    this.printFPS();

                    this.fpsIntervalTimeout = setInterval(() => {
                        this.printFPS();
                    },this.fpsInterval);
                }
            } else {
                console.log('Invalid rom or summin!');
            }
        }

        emulateCycle () {
            this.cpu.emulateCycle();
        }

        reset () {
            this.cpu.reset();
        }

        frame() {

        }

        printFPS() {

        }
        resetFPS() {

        }
        stop() {
            clearInterval(this.frameInterval);
            clearInterval(this.fpsInterval);
            this.isRunning = false;
        }
        loadRom(data) {
            if(this.isRunning) {
                this.stop();
            }

            // Update status to loading rom
            this.rom = new ROM(this);
            this.rom.load(data);

            if(this.rom.valid) {
                this.reset();
                this.mmap = this.rom.createMapper();
                if(!this.mmap) {
                    return;
                }
                
                this.mmap.loadRom();
                this.ppu.setMirroring(this.rom.getMirroringType());
                this.romData = data;

                // sussessfully loaded rom data...
            } else {
                // Invalid Rom
            }

            return this.rom.valid;
        }
        toJSON() {
            return {
                romData: this.romData,
                cpu: null,
                mmap: null,
                ppu: null,
            }
        }
        fromJSON(s) {
            // No plan to implement this yet. I prefer providing an external api as opposed to a config injection. 
        }
    }

    module.exports = NES;

},{"./cpu":1,"./mapper":3,"./ppu":5,"./program":6,"./rom":7}],5:[function(require,module,exports){

class PPU {
    constructor(nes) {
        this.nes = nes;

        this.STATUS_VRAMWRITE = 4;
        this.STATUS_SLSSPRITECOUNT = 5;
        this.STATUS_SPRITE0HIT = 6

        this.vramMem = null;
        this.spriteMem = null;
        this.vramAddress = null;
        this.vramTmpAddress = null;
        this.vramBufferedReadValue = null;
        this.firstWrite = null;
        this.sramAddress = null;
        this.currentMirroring = null;
        this.requestEndFrame = null;
        this.nmiOk = null;
        this.dummyCycleToggle = null;
        this.validTileData = null;
        this.nmiCounter = null;
        this.scanlineAlreadyRendered = null;
        this.f_nmiOnVblank = null;   
        this.f_spriteSize = null;
        this.f_bgPatternTable = null;
        this.f_spPatternTable = null;
        this.f_addrInc = null;
        this.f_nTblAddress = null;
        this.f_color = null;
        this.f_spVisibility = null;
        this.f_bgVisibility = null;
        this.f_spClipping = null;
        this.f_bgClipping = null;
        this.f_dispType = null;
        this.cntFV = null;
        this.cntV = null;
        this.cntH = null;
        this.cntVT = null;
        this.cntHT = null;
        this.regFV = null;
        this.regV = null;
        this.regH = null;
        this.regVT = null;
        this.regHT = null;
        this.regFH = null;
        this.regS = null;
        this.curNt = null;
        this.attrib = null;
        this.buffer = null;
        this.prevBuffer = null;
        this.bgbuffer = null;
        this.pixrendered = null;
        
        this.validTileData = null;
        this.scantile = null;
        this.scanline = null;
        this.lastRenderedScanline = null;
        this.curX = null;
        this.sprX = null; 
        this.sprY = null; 
        this.sprTile = null; 
        this.sprCol = null; 
        this.vertFlip = null; 
        this.horiFlip = null; 
        this.bgPriority = null; 
        this.spr0HitX = null; 
        this.spr0HitY = null; 
        this.hitSpr0 = null;
        this.sprPalette = null;
        this.imgPalette = null;
        this.ptTile = null;
        this.ntable1 = null;
        this.currentMirroring = null;
        this.nameTable = null;
        this.vramMirrorTable = null;
        this.palTable = null;
        
        
        // Rendering Options:
        this.showSpr0Hit = false;
        this.clipToTvSize = true;
        
        this.reset();
    }

    reset() {

    }

    Tile(data) {
        return new Tile(this.nes, data);
    }
}

// This is an antipattern, but the seperation of concerns in the nes is friggin weird.
class Tile {
    constructor(nes, data) {
        this.nes = nes;
        this.data = data;
    }

    setScanline(x,y,z) {

    }
}

module.exports = PPU;

},{}],6:[function(require,module,exports){

    class Program {

        constructor(nes) {
            this.nes = nes;
            
        }

        getPrgRom() {
            return null;
        }
        load() {

        }
    }

    module.exports = Program;

},{}],7:[function(require,module,exports){
class ROM {

    constructor(nes) {
        this.nes = nes;

        this.mapperName = new Array(92);
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

            this.header = new Array(16);
            // I thought this bitwise operator only returned 1 or 0... It is returning the char code if not zero...
            this.header.forEach((header, index) => {
                header = data.charCodeAt(index) & 0xFF
            });

            // this is all super specific. Not going to explain it all, but if you look up example rom files, this will make sense... Hopefully.
            this.romCount = this.header[4];
            this.vromCount = this.header[5]*2 //Getting the number of 4kb banks, not 8kb
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
            this.rom = new Array(this.romCount);
            this.rom.forEach((rom, index) => {
                // https://wiki.nesdev.com/w/index.php/NES_2.0 
                rom = new Array(prgRomSize);
                rom.forEach((el, i) => {
                    if(offset+i >= data.length) {
                        // I need to break out of this, but I will just return for now and waste the cycles
                        return;
                    }

                    el = data.charCodeAt(offset + i) & 0xFF;
                });

                offset += prgRomSize;
            });

            this.vrom = new Array(this.vromCount);
            this.vrom.forEach((x, xIndex) => {
                x = new Array(chrRomSize);
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
            this.vromTile = new Array(this.vromCount);
            this.vromTile.forEach((x, xIndex) => {
                // @TODO: figure out why this magic number is here and what it does. 
                x = new Array(256);
                x.forEach((y, yIndex) => {
                    // calls new seperately. 
                    y = this.nes.PPU.Tile(this.nes);
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
},{}]},{},[2]);
