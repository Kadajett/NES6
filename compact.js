(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
    const Util = require('./util');
    
    /**
     * 6502!!! Look it up!
     */
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
            this.memory = Util.fillArray(new Array(0x10000));

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

            this.IRQ_NMI = null; // @TODO: Set this properly

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
            
            this.memory = Util.fillArray(new Array(0x10000));

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
                this.memory[i] = 0xFF;
            }
            for(i = 0x2000; i <= 0x8000; i++) {
                this.memory[i] = 0;
            }

            this.pc = this.getResetVector();

            this.sp = 0xFD;

            this.a = this.x = this.y = 0;

            this.p = this.getProcessorFlags();
        }

        requestIrq(nmi) {
            // @TODO: write the interrupt logic
        }

        /**
         * This is the same thing as reauestIrq I believe. 
         * @link {function} requestIrq
         * @param {number} numberOfCycles 
         */
        haltCycles(numberOfCycles) {

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

},{"./util":12}],2:[function(require,module,exports){
(() => {
    const NES = require('./nes');
    window.nes = new NES();

    if(window.File && window.FileReader && window.FileList && window.Blob) {
        document.getElementById("filePicker").addEventListener('change', (evt) => {
            let files = evt.target.files;
            let reader = new window.FileReader();
            reader.readAsBinaryString(files[0])
            reader.onload = (fileInfo) => {
                window.nes.loadRom(fileInfo.srcElement.result);
            }
            
            
        });
    }

    console.log(window.nes)
})();
},{"./nes":5}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){

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

    /**
     * used in ppu?
     * Finish this!
     * @param {number} ht 
     * @param {number} vt 
     */
    getTileIndex(ht, vt) {
        return 0;
    }

    /**
     * 
     * @param {number} ht 
     * @param {number} vt 
     */
    getAttrib(ht, vt) {

    }
}

module.exports.NameTable = NameTable;
},{}],5:[function(require,module,exports){
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

            this.loadRom()
            // this.program = null;
        }

        /**
         * load the game!
         * @param {blob} data 
         */
        loadProgram (data) {
            // this.program = new Program(this);
            // this.program.load(data);
            // this.reset();
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
                this.ppu.setMirroring(this.rom.getMirroringType() || 0);
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

},{"./cpu":1,"./mapper":3,"./ppu":8,"./program":9,"./rom":10}],6:[function(require,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";

    // Slightly dubious tricks to cut down minimized file size
    var noop = function() {};
    var undefinedType = "undefined";

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    // Cross-browser bind equivalent that works at least back to IE6
    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces
    function realMethod(methodName) {
        if (methodName === 'debug') {
            methodName = 'log';
        }

        if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    // These private functions always need `this` to be set properly

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }

        // Define log.log as an alias for log.debug
        this.log = this.debug;
    }

    // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods
    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.
    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          if (typeof window === undefinedType) return;

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          if (typeof window === undefinedType) return;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          // Fallback to cookies if local storage gives us nothing
          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location !== -1) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */

      self.name = name;

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Top-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
        return _loggersByName;
    };

    return defaultLogger;
}));

},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
'use strict';

const { Tile } = require('./tile');
const { NameTable } = require('./nameTable');
const { PaletteTable } = require('./paletteTable');
const Util = require('./util');
const log = require('loglevel');

/**
 * PPU Picture Processing Unit
 * The NES PPU, or Picture Processing Unit, generates a composite video signal with 240 lines of pixels, 
 * designed to be received by a television. When the Famicom chipset was designed in the early 1980s, 
 * it was considered quite an advanced 2D picture generator for video games.
 * https://wiki.nesdev.com/w/index.php/PPU
 * @class
 * @alias module:PPU
 * @param {object} nes The current running nes class
 */
class PPU {

    constructor(nes) {

        this.nes = nes;

        this.STATUS_VRAMWRITE = 4;
        this.STATUS_SLSSPRITECOUNT = 5;
        this.STATUS_SPRITE0HIT = 6;
        this.STATUS_VBLANK = 7;
        this.maxPixels = 0xF000;

        // Rendering Options:
        this.showSpr0Hit = false;
        this.clipToTvSize = true;

        /**
         * used for drawing a background color on monochrome displays
         */
        this.internalColorPalette = {
            red: 0x0000FF,
            black: 0x0,
            green: 0x00FF00,
            blue: 0xFF0000
        };


        
        this.reset();
    }

    /**
     * Resets or creates the various variables used by the PPU
     */
    reset() {
        this.resetVramIO();
        this.resetVramSpriteMem();
        this.resetControlFlags();
        this.resetRenderingVars();
        this.resetCounters();
        this.resetSpriteData();
        this.resetTileTableBuffers();

        // misc resets
        this.curNt = null;
        /**
         * http://forums.nesdev.com/viewtopic.php?p=112424#p112424
         * TODO: watch the possible values here and document them
         */
        this.scanline = 0;
        this.lastRenderedScanline = -1;
        this.curX = 0;
        this.palTable = new PaletteTable();
        this.palTable.loadNTSCPalette();

        this.updateControlReg1(0);
        this.updateControlReg2(0);
    }

    resetRenderingVars() {
        this.attrib = this.scantile = Util.fillArray(new Array(32));
        this.bufferSize = {
            x: 256,
            y: 240
        }
        this.buffer = Util.fillArray(new Array(this.bufferSize.x * this.bufferSize.y))
        this.prevBuffer = Util.fillArray(new Array(this.bufferSize.x * this.bufferSize.y))
        this.bgbuffer = Util.fillArray(new Array(this.bufferSize.x * this.bufferSize.y))
        this.pixrendered = Util.fillArray(new Array(this.bufferSize.x * this.bufferSize.y));
        this.validTileData = null;
        this.sprPalette = Util.fillArray(new Array(16));
        this.imgPalette = Util.fillArray(new Array(16));
    }

    resetVramSpriteMem() {
        // Zero out vram and spriteMem
        /**
         *  32768 Found references to this all over rom files and nes dev. no exact description though
         */
        this.vramMem = Util.fillArray(new Array(0x8000)); 
        this.spriteMem = Util.fillArray(new Array(0x100));
        this.vramMem.forEach((element) => {
            element = 0;
        });
        this.spriteMem.forEach((element) => {
            element = 0;
        });
    }

    // f_ denotes a flag. usually a boolean value. 
    resetControlFlags() {
        /**
         * Control Flags Register 1
         */
        this.f_nmiOnVblank = 0;
        /**
         * The NES PPU offers the choice of 8x8 pixel or 8x16 pixel sprites. Each size has its advantages.
         * https://wiki.nesdev.com/w/index.php/Sprite_size
         */
        this.f_spriteSize = 0; 
        this.f_bgPatternTable = 0;
        this.f_spPatternTable = 0;
        this.f_addrInc = 0;
        this.f_nTblAddress = 0;

        // Register 2
        /** 
        * Flags
        */
        this.f_color = this.f_spVisibility = this.f_bgVisibility = this.f_spClipping = this.f_bgClipping = this.f_dispType = 0;
    }

    resetCounters() {
        /**
         * Registers
         * https://wiki.nesdev.com/w/index.php/PPU_registers
         * The PPU exposes eight memory-mapped registers to the CPU. 
         * These nominally sit at $2000 through $2007 in the CPU's address space, but because they're incompletely decoded, 
         * they're mirrored in every 8 bytes from $2008 through $3FFF, so a write to $3456 is the same as a write to $2006.
         */
        this.regV = this.regFV = this.regFH = this.regH = this.regVT = this.regHT = this.regFH = this.regS = 0;

        /**
         * Counters
         */
        this.cntFV = this.cntV = this.cntH = this.cntVT = this.cntHT = null;


        this.nmiCounter = 0;
    }

    resetVramIO() {
        // VRAM I/O
        this.vramAddress = null;
        this.vramTmpAddress = null;
        this.vramBufferedReadValue = 0;
        this.firstWrite = true; // VRAM/Scroll Hi/Lo latch
        
        /**
        * 8-bit only
        */
        this.sramAddress = 0;
        this.currentMirroring = -1;
        this.requestEndFrame = false;
        this.nmiOk = 0;
        this.scanlineAlreadyRendered = null;
    }

    resetSpriteData() {
        this.sprX = Util.fillArray(new Array(64))
        this.sprY = Util.fillArray(new Array(64))
        this.sprTile = Util.fillArray(new Array(64))
        this.sprCol = Util.fillArray(new Array(64))
        this.vertFlip = Util.fillArray(new Array(64))
        this.horiFlip = Util.fillArray(new Array(64))
        this.bgPriority = Util.fillArray(new Array(64));
        this.spr0HitX = this.spr0HitY = 0;
        this.hitSpr0 = false;
    }

    resetTileTableBuffers() {
        this.ptTile = Util.fillArray(new Array(512));
        this.ptTile.forEach((tile) => {
            tile = this.Tile(this.nes);
        });

        this.ntable1 = Util.fillArray(new Array(4)) 
        this.nameTable = Util.fillArray(new Array(4));
        this.currentMirroring = -1;
        this.nameTable.forEach((nt, index, array) => {
            array[index] = this.NameTable( 32, 32, "Nt"+1);
        });
        this.vramMirrorTable = Util.fillArray(new Array(0x8000));
        this.vramMirrorTable.forEach((vmt, index, array) => {
            array[index] = index;
        });
    }

    setMirroring(mirroring) {
        if(mirroring === this.currentMirroring) {
            return;
        }

        this.currentMirroring = mirroring;
        this.triggerRendering();

        if(this.vramMirrorTable === null) {
            this.vramMirrorTable = Util.fillArray(new Array(0x8000));
        }
        this.vramMirrorTable.forEach((vmt, index, array) => {
            array[index] = index;
        });

        // https://opcode-defined.quora.com/How-NES-Graphics-Work-Sprites-and-Palettes Is the best resource for learning about this. 
        // Drink some whiskey before you get into it. 
        this.defineMirrorRegion(0x3F20, 0x3F00, 0x20);
        this.defineMirrorRegion(0x3F40, 0x3F00, 0x20);
        this.defineMirrorRegion(0x3F80, 0x3F00, 0x20);
        this.defineMirrorRegion(0x3Fc0, 0x3F00, 0x20);

        this.defineMirrorRegion(0x3000, 0x2000, 0xF00);
        this.defineMirrorRegion(0x4000, 0x0000, 0x4000);

        if(mirroring === this.nes.rom.HORIZONTAL_MIRRORING) {
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            
            this.defineMirrorRegion(0x2400, 0x2000, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2800, 0x400);
        } else if(mirroring === this.nes.rom.VERTICAL_MIRRORING) {
            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 0;
            this.ntable1[3] = 1;
            
            this.defineMirrorRegion(0x2800, 0x2000, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2800, 0x400);
        } else if(mirroring === this.nes.rom.SINGLESCREEN_MIRRORING) {
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 0;
            this.ntable1[3] = 0;
            
            this.defineMirrorRegion(0x2400, 0x2000, 0x400);
            this.defineMirrorRegion(0x2800, 0x2000, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2000, 0x400);
        } else if(mirroring === this.nes.rom.SINGLESCREEN_MIRRORING2) {
            this.ntable1[0] = 1;
            this.ntable1[1] = 1;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            
            this.defineMirrorRegion(0x2400, 0x2400, 0x400);
            this.defineMirrorRegion(0x2800, 0x2400, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2400, 0x400);
        } else {
            // assume 4 screen mirroring

            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 2;
            this.ntable1[3] = 3;

            // No mirroring region?
        }
    }

    /**
     * renders current scanline and then increments.  
     */
    triggerRendering() {
        if(this.scanline >= 21 && this.scanline <= 260) {
            this.renderFramePartially(this.lastRenderedScanline + 1, this.scanline - 21 - this.lastRenderedScanline);
            this.lastRenderedScanline = this.scanline - 21;
        }
    }

    /**
     * This is the place to start if you are trying to learn about memory mirroring. Very simple topic. 
     * https://wiki.nesdev.com/w/index.php/Mirroring
     * @param {number} fromStart mirrored address in the mirror table 
     * @param {number} toStart the non-mirrored address in memory that we are going to be mirroring to
     * @param {number} size the number of spaces in the memory array that we will be mirroring
     */
    defineMirrorRegion(fromStart, toStart, size) {
        
        for(let i = 0; i < size; i++) {
            this.vramMirrorTable[fromStart+i] = toStart+i;
        }
    }

    startVBlank() {
        // Do NMI Non Maskable Interrupt
        this.nes.cpu.requestIrq(this.nes.cpu.IRQ_NMI);

        // make sure everything is rendered
        // 239 because the PPU generates a video signal with 240 lines of pixels
        if(this.lastRenderedScanline < 239) {
            this.renderFramePartially(
                this.lastRenderedScanline + 1,
                240 - this.lastRenderedScanline
            )
        }

        this.endFrame();
        this.resetLastRenderedScanline();
    }

    endScanline() {
        switch(this.scanline) {
            case 19: 
                // Dummy scanline
                if(this.dummyCycleToggle){
                    // removes the dummy pixel at the end of each scanline
                    this.curX = 1;
                }
                break;
            
            case 20: 
                // Clear VBlank flag? 
                this.setStatusFlag(this.STATUS_VBLANK, false);

                // clear Sprite #0 hit flag
                this.setStatusFlag(this.STATUS_SPRITE0HIT, false);
                this.hitSpr0 = false;
                this.spr0HitX = this.spr0HitY = -1;

                if(this.f_bgVisibility == 1 || this.f_spVisibility == 1) {
                    // setting the counters to what is held in the faux-registers? 
                    this.cntFV = this.regFV;
                    this.cntV = this.regV;
                    this.cntH = this.regH;
                    this.cntVT = this.regVT;
                    this.cntHT = this.regHT;

                    if(this.f_bgVisibility == 1) {
                        // Render dummy scanline
                        this.renderBGScanline(false, 0);
                    }
                }
                // Sadly, the flags arent booleans and arent always 0 || 1. In this case they are, so I can booleanify them. 
                if(!!this.f_bgVisibility && !!this.f_spVisibility) {
                    // Check sprite0 hit for first scanline
                    this.checkSprite0(0)
                }

                if(!!this.f_bgVisibility || !!this.f_spVisibility) {
                    this.nes.mapper.clockIrqCounter();
                }
                break;
            
            case 261: 
                // Dead scanline do not render
                this.setStatusFlag(this.STATUS_VBLANK, true);
                this.requestEndFrame = true;
                this.nmiCounter = 9;

                // Wrap around
                this.scanline = -1; // will be incremented to 0 later
                break;
            default: 
                if(this.scanline > 21 && this.scanline <= 260) {
                    // Render normally
                    if(this.f_bgVisibility == 1) {
                        if(!this.scanlineAlreadyRendered) {
                            this.cntHT = this.regHT;
                            this.cntH = this.regH;
                            this.renderBGScanline(true, this.scanline - 20);
                        }
                        this.scanlineAlreadyRendered = false;

                        // Check for sprite 0
                        if(!this.hitSpr0 && this.f_spVisibility == 1) {
                            if(Array.isArray(this.sprX) &&
                            Array.isArray(this.sprY) &&
                            this.sprx[0] >= -7 &&
                            this.sprY[0] + 1 <= (this.scanline - 20) &&
                            (this.sprY[0] + 1 + (this.f_spriteSize === 0 ? 8:16)) >= (this.scanline - 20)) {
                                if(this.checkSprite0(this.scanline - 20)) {
                                    this.hitSpr0 = true;
                                }
                            }
                        }
                    }
                }

                if(this.f_bgVisibility == 1 || this.f_spVisibility == 1) {
                    // clock mapper irq counter. Whatever that means...
                    this.nes.mapper.clockIrqCounter();
                }
        }

        this.scanline ++;
        this.regsToAddress();
        this.cntsToAddress();
    }

    /**
     * Prepare frame for display. Includes decideing the background color and creating the pixel buffer
     */
    startFrame() {
        let bgColor = 0;
        let buffer = this.buffer;
        let i;
        let pixrendered = this.pixrendered;


        // set background color
        if(this.f_dispType === 0) {
            // color display
            // Use first entry in palette as BG Color
            bgColor = this.imgPalette[0];
        } else {
            switch (this.f_color) {
                case 0:
                    bgColor = this.internalColorPalette.black;
                    break;
                case 1:
                    bgColor = this.internalColorPalette.green;
                    break;
                case 2:
                    bgColor = this.internalColorPalette.blue;
                    break;
                case 3:
                    // Invalid, use black
                    bgColor = this.internalColorPalette.black;
                    break;
                case 4:
                    bgColor = this.internalColorPalette.red;
                    break; 
                default: 
                    // invalid, use black
                    bgColor = this.internalColorPalette.black;
            }
        }

        buffer.forEach(element => {
            element = bgColor;
        });
        pixrendered.forEach(element => {
            element = 65;
        });
    }

    endFrame() {
        // @TODO: Finish this
        let i, x, y, buffer = this.buffer;
        let red = 0x55FF55; // this is different from the original red for some reason? 
        // Very drunk while writing this. Sorry for the crappy code!
        if(this.showSpr0Hit) {
            if(this.sprX[0] >= 0 && this.sprX[0] < this.bufferSize.x && this.sprY[0] >= 0 && this.sprY[0] < this.bufferSize.y) {
                for(i = 0; i < this.bufferSize.x; i++){
                    buffer[(this.sprY[0] << 8) + i] = red;
                    if(i < this.bufferSize.y) {
                        buffer[(i << 8) + this.sprX[0]] = red; // what would happen if I change this value? Play around with it... 
                    }
                }
                
            }
            if(this.spr0HitX >= 0 && this.spr0HitX < this.bufferSize.x && this.spr0HitY >= 0 && this.spr0HitY < this.bufferSize.y) {
                for(i = 0; i < this.bufferSize.x; i++){
                    buffer[(this.spr0HitY << 8) + i] = red;
                    if(i < this.bufferSize.y) {
                        buffer[(i << 8) + this.spr0HitX] = red; // what would happen if I change this value? Play around with it... 
                    }
                }
                
            }
        }

        // if either the sprite or the bg is clipped, clip both. Fix later? 
        if(this.clipToTvSize || this.f_bgClipping === 0 || this.f_spClipping === 0) {
            /**
             * This is where we do the clipping for the screen edges
             */
            // clip left 8 pixels
            for(y = 0; y < this.bufferSize.y; y++) {
                for(x = 0; x < 8; x++) {
                    buffer[(y << 8) + x] = 0;
                }
            }
        }

        if(this.clipToTvSize) {
            for(y = 0; y < 8; y++) {
                for(x = 0; x < this.bufferSize.x; x++) {
                    buffer[(y << 8) + x] = 0;
                    buffer[((239 - y) << 8) + x] = 0;
                }1
            }
        }

        if(this.nes.opts.showDisplay) {
            // this.nes.ui.writeFrame(buffer, this.prevBuffer);
        }
    }

    /**
     * This changes all the flag values
     * I copied this over from jsnes. From what I can tell, it is only ever taking an argument of 1. 
     * This will essentially set all flags to 0 aside from the regh value
     * @param { number } value 
     * @return null
     */
    updateControlReg1(value) {
        this.triggerRendering();

        this.f_nmiOnVblank = (value>>7)&1;
        this.f_spriteSize = (value>>5)&1;
        this.f_bgPatternTable = (value>>4)&1;
        this.f_spPatternTable = (value>>3)&1;
        this.f_addrInc = (value>>2)&1;
        this.f_nTblAddress = value&3;

        this.regV = (value>>1)&1;
        this.regH = value&1;
        this.regS = (value>>4)&1;
    }
    // Can I combine these functions?
    updateControlReg2(value) {
        this.triggerRendering();

        this.f_color = (value>>5)&7;
        this.f_spVisibility = (value>>4)&1;
        this.f_bgVisibility = (value>>3)&1;
        this.f_spClipping = (value>>2)&1;
        this.f_bgClipping = (value>>1)&1;
        this.f_dispType = value&1;

        if(this.f_dispType === 0) {
            this.palTable.setEmphasis(this.f_color);
        }

        this.updatePalettes()
    }

    updatePalettes() {}

    checkSprite0(line) {
        // @TODO: do this
    }

    /**
     * rewrite this plzbb
     * @param {Array} bgBuffer 
     * @param {Blob} scan 
     */
    renderBGScanline(bgBuffer, scan) {
        let baseTile = (this.regS === 0 ? 0 : 256),
            destIndex = (scan<<8), // 1? 256>>8 = 00000001
            resetTileTableBuffers,
            tile,
            t,
            sx,
            x,
            tpix, 
            att, 
            col,
            tscanOffset = this.cntFV<<3,
            scantile = this.scantile,
            attrib = this.attrib,
            ptTile = this.ptTile,
            nameTable = this.nameTable,
            imgPalette = this.imgPalette,
            pixrendered = this.pixrendered,
            targetBuffer = bgBuffer ? this.bgbuffer : this.buffer;
        
        this.cntHT = this.regHT;
        this.cntH = this.regH;
        // lol why?
        this.curNt = this.ntable1[this.cntV+this.cntV+this.cntH];
        
        if(scan < 240 && (scan-this.cntFV)>=0) {
            for(tile = 0; tile < 32; tile ++) {
                if(scan>=0){
                    // fetch tile and attrib data
                    if(this.validTileData) {
                        t = scantile[tile];
                        tpix = t.pix;
                        att = attrib[tile];
                    } else {
                        t = ptTile[baseTile+nameTable[this.curNt].getTileIndex(this.cntHT, this.cntVT)];
                        tpix = t.pix;
                        att = nameTable[this.curNt].getAttrib(this.cntHT, this.cntVT);
                        scantile[tile] = t;
                        attrib[tile] = att;
                    }

                    sx = 0;
                    x = (tile << 3) - this.regFH; 

                    if(x>-8) {
                        if(x<0) {
                            destIndex -= x; // += -(-x) lol
                            sx = -x;
                        }
                        if(t.opaque[this.cntFV]) {
                            for(;sx<8;sx++) {
                                targetBuffer[destIndex] = imgPalette[tpix[tscanOffset+sx] + att];
                                pixrendered[destIndex] |= 256;
                                destIndex++;
                            }
                        } else {
                            for(; sx< 8; sx++) {
                                col = tpix[tscanOffset + sx];
                                if(col !== 0) {
                                    targetBuffer[destIndex] = imgPalette[col+att];
                                    pixrendered[destIndex] |= 256;
                                }
                                destIndex ++;
                            }
                        }
                    }
                }
                if(++this.cntHT==32) {
                    this.cntHT = 0;
                    this.cntH ++;
                    this.cntH%=2;
                    this.curNt = this.ntable1[(this.cntV<<1) + this.cntH];
                }
            }
            
            this.validTileData = true;
        }

        this.cntFV++;
        if(this.cntFV == 8) {
            this.cntFV = 0;
            this.cntVT++;
            if(this.cntVT == 30) {
                this.cntVT = 0;
                this.cntV++;
                this.cntV%=2;
                this.curNt = this.ntable1[(this.cntV<<1) + this.cntH];
            } else if(this.cntVT == 32) {
                this.cntVT = 0;
            }
            // arbitrary?
            this.validTileData = false;
        }
    }

    /**
     * Sets value at the given memory location 
     * @param {number} flag location of the flag in memory. See table towards top of this file.
     * @param {number} value
     */
    setStatusFlag(flag, value) {
        // Should add a timer here. Suspect this is a bottleneck. 
        let n = 1<<flag;
        this.nes.cpu.mems[0x2002] = ((this.nes.cpu.mem[0x2002] & (255 - n)) | (value?n:0));
    }

    readStatusRegister() {
        let tmp = this.nes.cpu.mem[0x2002];

        this.firstWrite = true;

        this.setStatusFlag(this.STATUS_VBLANK, false);

        return tmp;
    }

    writeSRAMAddress(address) {
        this.sramAddress = address;
    }

    /**
     * CPU Register $2004
     * https://wiki.nesdev.com/w/index.php/PPU_registers#OAM_data_.28.242004.29_.3C.3E_read.2Fwrite
     */
    sramLoad() {
        return this.spriteMem[this.sramAddress];
    }

    /**
     * CPU Register $2004
     * https://wiki.nesdev.com/w/index.php/PPU_registers#OAM_data_.28.242004.29_.3C.3E_read.2Fwrite
     * @param {} value 
     */
    sramWrite(value) {
        this.spriteMem[this.sramAddress] = value;
        this.spriteRamWriteUpdate(this.sramAddress, value);
        this.sramAddress++;
        this.sramAddress %= 0x100;
    }

    /**
     * CPU Register $2006
     * Sets the address used when reading/writing from/to VRAM.
     * this first write sets the high byte, the second, the low byte
     * I still dislike the use of the firstWrite flag so heavily. Maybe I am missing something? 
     * @param {number} address 
     */
    writeVRAMAddress(address) {

        if(this.firstWrite) {
            this.regFV = (address>>4)&3;
            this.regV = (address>>3)&1;
            this.regH (address>>2)&1;
            this.regVT = (this.regVT&7) | ((address&3)<<3);

        } else {
            this.triggerRendering();

            this.regVT = this.regVT&24 | ((address>>5)&7);
            this.regHT = address&31;

            this.cntFV = this.regFV;
            this.cntV = this.regV;
            this.cntH = this.regH;
            this.cntVT = this.regVT;
            this.cntHT = this.regHT;
            // why -20? 
            this.checkSprite0(this.scanline - 20);
        }

        this.firstWrite = !this.firstWrite;

        this.cntsToAddress();
        if(this.vramAddress < 0x2000) {
            this.nes.mapper.latchAccess(this.vramAddress);
        }
    }

    /**
     * CPU Register $2007(Read)
     * https://wiki.nesdev.com/w/index.php/PPU_registers#Data_.28.242007.29_.3C.3E_read.2Fwrite
     * Read from PPU memory. The address should be set first?
     */
    vramLoad() {
        let tmp;

        this.cntsToAddress();
        this.regsToAddress();

        // If address is in range of 0x0000-0x3EFF, return buffered values:
        if(this.vramAddress <= 0X3EFF) {
            tmp = this.vramBufferedReadValue;

            // Update buffered values
            if(this.vramAddress <= 0x2000) {
                this.vramBufferedReadValue = this.vramMem[this.vramAddress];
            } else {
                this.vramBufferedReadValue = this.mirrordLoad(this.vramAddress);
            }

            // Mapper latch access
            if(this.vramAddress < 0x2000) {
                this.nes.mapper.latchAccess(this.vramAddress);
            }

            
            this.incrementVRamAddress()

            this.cntsFromAddress();
            this.regsFromAddress();

            return tmp;
        }

        // no buffering in this mem range. Read normally?
        tmp = this.mirrordLoad(this.vramAddress);

        this.incrementVRamAddress();

        this.cntsFromAddress();
        this.regsFromAddress();

        return tmp;
    }

    /**
     * CPU Register $2007{Write}
     * Write value to current vramAddress location. Weird that you cant specify. Will probably go back and change it
     * https://wiki.nesdev.com/w/index.php/PPU_registers#Data_.28.242007.29_.3C.3E_read.2Fwrite
     * @param {number} value 
     */
    vramWrite(value) {

        this.triggerRendering();
        this.cntsToAddress();
        this.regsToAddress();

        if(this.vramAddress >= 0x2000) {
            // Mirroring is being used 
            this.mirroredWrite(this.vramAddress, value);
        } else {

            // Write normally
            this.writeMem(this.vramAddress, value);

            this.nes.mapper.latchAccess(this.vramAddress);
        }

        this.incrementVRamAddress();
        this.regsFromAddress();
        this.cntsFromAddress();
    }

    /**
     * CPU register $4014
     * Write 256 bytes of main memory into sprite ram
     * Copies from cpu memory into the PPU sprite memory
     * https://wiki.nesdev.com/w/index.php/PPU_registers#OAM_DMA_.28.244014.29_.3E_write
     * OAMDMA Common Name
     * @param {number} value 
     */
    sramDMA(value) {
        let baseAddress,
            data,
            i;
        
        baseAddress = value * 0x100;

        for(i = this.sramAddress; i < 256; i++) {
            data = this.nes.cpu.mem[baseAddress + 1];
            // why are we modifying both of these
            this.spriteMem[i] = data;
            this.spriteRamWriteUpdate(i, data);
        }

        // The CPU is suspended during the transfer, which will take 513 or 514 cycles after the $4014 write tick. 
        // (1 dummy read cycle while waiting for writes to complete, +1 if on an odd CPU cycle, then 256 alternating read/write cycles.)
        this.nes.cpu.haltCycles(513)
    }
    
    /**
     * increment by either 1 or 32, depending on d2? of Control Register 1: 
     * this is always incremented by the same amount. Why?
     * I don't like the idea of incrememting our current memory address every time we load or write from it.
     * You will see a similar increment in the vramWrite below. 
     * 
     * https://wiki.nesdev.com/w/index.php/PPU_registers#Data_.28.242007.29_.3C.3E_read.2Fwrite
     * https://wiki.nesdev.com/w/index.php/PPU_registers#Reg2000
     * 
     * VRAM read/write data register. After access, the video memory address will increment by an amount determined by $2000:2.
     */
    incrementVRamAddress(){
        this.vramAddress += (this.f_addrInc == 1 ? 32 : 1);
    }

    /**
     * Writes to memory, taking into account mirroring/mapping of address ranges
     * https://wiki.nesdev.com/w/index.php/Mirroring
     * 
     * Addresses $3F10/$3F14/$3F18/$3F1C are mirrors of $3F00/$3F04/$3F08/$3F0C. 
     * Note that this goes for writing as well as reading. A symptom of not having implemented this correctly 
     * in an emulator is the sky being black in Super Mario Bros., 
     * which writes the backdrop color through $3F10.
     * @param {number} address location in mirrored space to write value to
     * @param {Blob} value value to write at location
     */
    mirroredWrite(address, value) {
        if(address >= 0x3F00 && address < 0x3F20) {
            // Palette write mirroring
            // Come back and rewrite using these: this.defineMirrorRegion(0x3F00, 0x3F10, 1);
            // https://wiki.nesdev.com/w/index.php/PPU_palettes
            if(address == 0x3F00 || address == 0x3F10) {
                this.writeMem(0x3F00, value);
                this.writeMem(0x3F10, value);
            } else if(address == 0x3F04 || address == 0x3F14) {
                this.writeMem(0x3F04, value);
                this.writeMem(0x3F14, value);
            } else if(address == 0x3F08 || address == 0x3F18) {
                this.writeMem(0x3F08, value);
                this.writeMem(0x3F18, value);
            } else if(address == 0x3F0C || address == 0x3F1C) {
                this.writeMem(0x3F0C, value);
                this.writeMem(0x3F1C, value);
            } else {
                this.writeMem(address, value);
            }
        } else {
            if(address < this.vramMirrorTable.length) {
                this.writeMem(this.vramMirrorTable[address], value);
            } else {
                // invalid write location. 
                log.error('PPU; MirroredWrite: Invalid VRAM write address: ', address.toString(16));
            }
        }
    }

    /**
     * Updates the scroll registers from the new vramAddress
     * https://wiki.nesdev.com/w/index.php/PPU_registers
     * https://wiki.nesdev.com/w/index.php/PPU_scrolling ? maybe related, but cool wiki page
     * very similar to PPU.regsFromAddress()
     */
    cntsFromAddress() {
        let address = (this.vramAddress>>8)&0xFF;
        this.cntFV = (address>>4)&3; // 3..toString(2) -> 11
        this.cntV = (address>>3)&1;
        this.cntH = (address>>2)&1;
        this.cntVT = (this.cntVT&7) | ((address>>5)&7);

        address = this.vramAddress&0xFF;
        this.cntVT = (this.cntVT&24) | ((address>>5)&7);
        this.cntHT = address&31;
    }

    /**
     * Updates the scroll registers from the new vramAddress
     * https://wiki.nesdev.com/w/index.php/PPU_registers
     * https://wiki.nesdev.com/w/index.php/PPU_scrolling ? maybe related, but cool wiki page
     * very similar to PPU.regsFromAddress()
     */
    regsToAddress() {
        let b1,
            b2;
        
        b1 = (this.regFV&7)<<4;
        // |= -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators#Bitwise_OR_assignment_2
        b1 |= (this.regV&1)<<3;
        b1 |= (this.regH&1)<<2;
        b1 |= (this.regVT>>3)&3;

        b2 = (this.regVT&7)<<5;
        b2 |= this.regHT&31;

        this.vramTmpAddress = ((b1<<8) | b2)&0x7FFF; // 32767

    }

    /**
     * Updates the scroll registers from a new VRAM address.
     * seems to be called whenever you modify the vramAddress var
     * https://wiki.nesdev.com/w/index.php/PPU_registers
     */
    cntsToAddress() {
        let b1,
            b2;
        
        b1 = (this.cntFV&7)<<4;
        // |= -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators#Bitwise_OR_assignment_2
        b1 |= (this.cntV&1)<<3;
        b1 |= (this.cntH&1)<<2;
        b1 |= (this.cntVT>>3)&3;

        b2 = (this.cntVT&7)<<5;
        b2 |= this.cntHT&31;

        this.vramTmpAddress = ((b1<<8) | b2)&0x7FFF; // 32767
    }

    /**
     * This needs to be refactored... Suuuu ugly
     * @param {number} count number of times to increment the counters
     */
    incTileCounter(count) {
        let i;

        for(i=count; i!==0; i--) {
            this.cntHT++;
            if(this.cntHT == 32) {
                this.cntHT = 0;
                this.cntVT++;
                if(this.cntVT >= 30) {
                    this.cntH++;
                    if(this.cntH == 0) {
                        this.cntH = 0;
                        this.cntV++;
                        if(this.cntV == 2) {
                            this.cntV = 0;
                            this.cntFV++;
                            this.cntFV &= 0x7;
                        }
                    }
                }
            }
        }
    }

    /**
     * 
     * @param {number} address Location in memory to write value to
     * @param {Blob} value value to write in memory address
     */
    writeMem(address, value) {

        this.vramMem[address] = value; // or something like that
    }

    /**
     * Updates the scroll registers from a new VRAM address.
     * seems to be called whenever you modify the vramAddress var
     * https://wiki.nesdev.com/w/index.php/PPU_registers
     */
    regsFromAddress() {
        // 0xff -> 255 -> 11111111
        // should come back and see what vramTmpAddress possible values are
        let address = (this.vramTmpAddress>>8)&0xFF;
        this.regFV = (address>>4)&7; // 7..toString(2) -> 111
        this.regV = (address>>3)&1; // 1..toString(2) -> 1
        this.regH = (address>>2)&1;
        this.regVT = (this.regVT&7) | ((address>>5)&7)

        address = this.vramTmpAddress&0xFF; // 0xFF -> 255;
        this.regVT = (this.regVT&24) | ((address>>5)&7);
        this.regHT = address&31; // 31..toString(2) -> 11111
    }

    /**
     * Reads from memory, taking into account mirroring/mapping of address ranges
     * Refactor this
     * @param {number} address address to load from
     */
    mirrordLoad(address) {
        return this.vramMem[this.vramMirrorTable[address]];
    }

    /**
     * CPU Register $2005
     * write to scroll registers
     * this first write is the horizontal offset, the second is the vertical offset.
     * TODO: I would prefer if this didn't use the firstWrite flag, but took two parameters
     * @param {*} value 
     * @param {boolean} firstWrite
     */
    scrollWrite(value) {
        this.triggerRendering();
        console.log('PPU; scrollWrite: value:', value);
        if(this.firstWrite) {
            // horizontal

            // 31..toString(2) => 1111 
            // What would this value be? 
            this.regHT = (value>>3)&31;
            // 7..toString(2) => 111
            this.regFH = value&7;
        } else {
            // vertical

            this.regFV = value&7;
            this.regVT = (value>>3)&31;

        }

        this.firstWrite = !this.firstWrite;
    }

    spriteRamWriteUpdate(address, value) {

    }

    resetLastRenderedScanline() {
        // just doing this in a function so I can easily track when it happens during debugging. 
        this.lastRenderedScanline = -1;
    }

    /**
     * This actually writes to the buffer. 
     * @param {number} startScan 
     * @param {number} scanCount 
     */
    renderFramePartially(startScan, scanCount) {
        
        // if(this.f_spVisibility == 1) {
        //     this.renderSpritesPartially(startScan, scanCount, true);
        // }

        if(this.f_bgVisibility == 1) {
            let si = startScan<<8,
                ei = (startScan + scanCount<<8),
                destIndex,
                buffer = this.buffer,
                bgBuffer = this.bgbuffer,
                pixrendered = this.pixrendered;

            if(ei > this.maxPixels) {
                ei = this.maxPixels;
            }
            for(destIndex = si; destIndex < ei; destIndex++) {
                if(pixrendered[destIndex] > 0xFF) {
                    buffer[destIndex] = bgBuffer[destIndex];
                }
            }

        }
        // this was duplicated above the bg renderer as well as here. If we see weird issues in display, look there?
        if(this.f_spVisibility == 1) {
            this.renderSpritesPartially(startScan, scanCount, true);
        }

        // Why are we doing this?
        this.validTileData = false;
    }

    /**
     * 
     * @param {number} scanLine 
     * @param {number} scanCount 
     * @param {boolean} bl
     */
    renderSpritesPartially(scanLine, scanCount, bl) {

    }

    NameTable(x, y, index) {
        // Should probably just return a reference to the class
        return new NameTable(this.nes, x, y, index)
    }

    Tile(data) {
        // Should probably just return a reference to the class
        return new Tile(this.nes, data);
    }
}

module.exports = PPU;

},{"./nameTable":4,"./paletteTable":7,"./tile":11,"./util":12,"loglevel":6}],9:[function(require,module,exports){

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

},{}],10:[function(require,module,exports){
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
},{"./util":12}],11:[function(require,module,exports){
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
},{"./util":12}],12:[function(require,module,exports){
class Util {
    /**
     * used to prep arrays for memory use. Fills them with null so they can be looped over later
     * @param {array} array the array to fill with null values
     */
    fillArray(array) {
        if(array && array.length) {
            let length = array.length;
            for(let i = 0; i < length; i ++) {
                array[i] = null;
            }
        } else {
            // using var here so it can get out of the if block
            var array = [null];
        }
        return array;
    }
}

module.exports = new Util();
},{}]},{},[2]);
