/**
 * PPU Picture Processing Unit
 * https://wiki.nesdev.com/w/index.php/PPU
 */

const { Tile } = require('./tile');
const { NameTable } = require('./nameTable');
const { PaletteTable } = require('./paletteTable');

class PPU {

    constructor(nes) {

        this.nes = nes;

        this.STATUS_VRAMWRITE = 4;
        this.STATUS_SLSSPRITECOUNT = 5;
        this.STATUS_SPRITE0HIT = 6;
        this.STATUS_VBLANK = 7;

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
        this.scanline = 0;
        this.lastRenderedScanline = -1;
        this.curX = 0;
        this.palTable = new PaletteTable();
        this.palTable.loadNTSCPalette();

        this.updateControlReg1(0);
        this.updateControlReg2(0);
    }

    resetRenderingVars() {
        this.attrib = this.scantile = new Array(32);
        this.bufferSize = {
            x: 256,
            y: 240
        }
        this.buffer = this.prevBuffer = this.bgbuffer = this.pixrendered = new Array(this.bufferSize.x * this.bufferSize.y);
        this.validTileData = null;
        this.sprPalette = this.imgPalette = new Array(16);
    }

    resetVramSpriteMem() {
        // Zero out vram and spriteMem
        /**
         *  32768 Found references to this all over rom files and nes dev. no exact description though
         */
        this.vramMem = new Array(0x8000) 
        this.spriteMem = new Array(0x100)
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
         * possible values of
         * 0=8x8, 1=8x16
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
        this.sprX = this.sprY = this.sprTile = this.sprCol = this.vertFlip = this.horiFlip = this.bgPriority = new Array(64);
        this.spr0HitX = this.spr0HitY = 0;
        this.hitSpr0 = false;
    }

    resetTileTableBuffers() {
        this.ptTile = new Array(512);
        this.ptTile.forEach((tile) => {
            tile = this.Tile(this.nes);
        });

        this.ntable1 = this.nameTable = new Array(4);
        this.currentMirroring = -1;
        this.nameTable.forEach((nt) => {
            nt = new NameTable(this.nes, 32, 32, "Nt"+1);
        });
        this.vramMirrorTable = new Array(0x8000);
        this.vramMirrorTable.forEach((vmt, index) => {
            vmt = index; // I think I am resetting this incorrectly. Will have to wait and see.
        });
    }

    setMirroring(mirroring) {
        if(mirroring === this.currentMirroring) {
            return;
        }

        this.currentMirroring = mirroring;
        this.triggerRendering();

        if(this.vramMirrorTable === null) {
            this.vramMirrorTable = new Array(0x8000);
        }
        this.vramMirrorTable.forEach((vmt, index) => {
            vmt = i;
        });

        // https://opcode-defined.quora.com/How-NES-Graphics-Work-Sprites-and-Palettes Is the best resource for learning about this. Drink some whiskey before you get into it. 
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
     * Not written yet! It'll be cool though I bet. 
     */
    triggerRendering() {

    }

    defineMirrorRegion(fromStart, toStart, size) {
        // think of this like a piston array. It mirrors at specific places through the engine non sequentially. 
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
            for(y = 0; y < 8 y++) {
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

    /**
     * used all over the place. Document when possible
     */
    regsToAddress() {

    }

    /**
     * Used all over the place. Document when possible
     */
    cntsToAddress() {

    }

    checkSprite0(line) {
        // @TODO: do this
    }

    renderBGScanline() {
        // @TODO: Do this
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

            // increment by either 1 or 32, depending on d2? of Control Register 1:
            this.vramAddress += (this.f_addrInc == 1? 32 : 1);

            this.cntsFromAddress();
            this.regsFromAddress();

            return tmp;
        }

        // no buffering in this mem range. Read normally?
        tmp = this.mirrordLoad(this.vramAddress);

        // I don't like the idea of incrememting our current memory address every time we load or write from it.
        // You will see a similar increment in the vramWrite below. 
        this.vramAddress += (this.f_addrInc == 1 ? 32  : 1);

        this.cntsFromAddress();
        this.regsFromAddress();

        return tmp;
    }

    /**
     * CPU Register $2007{Write}
     * Write value to current vramAddress location. Weird that you cant specify. Will probably go back and change it
     * @param {number} value 
     */
    vramWrite(value) {

        this.triggerRendering();
        this.cntsToAddress();
        this.regsToAddress();

        if(this.vramAddress >= 0x2000) {
            // Mirroring is being used
            this.mirroredWrite(this.vramAddress, value);
        }
    }

    /**
     * 
     * @param {number} address location in mirrored space to write value to
     * @param {Blob} value value to write at location
     */
    mirroredWrite(address, value) {

    }

    /**
     * Not sure what this does yet. Come back and describe
     */
    cntsFromAddress() {

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
     * What does this do? Describe later
     */
    regsFromAddress() {

    }

    /**
     * 
     * @param {number} address 
     */
    mirrordLoad(address) {

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

    renderFramePartially(startLine, stopLine) {
        // @TODO: finish this
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
