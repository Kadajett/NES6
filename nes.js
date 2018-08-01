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
