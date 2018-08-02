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

        requestIrq(nmi) {
            // @TODO: write the interrupt logic
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