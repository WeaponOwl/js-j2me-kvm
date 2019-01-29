var Kvm = window.Kvm || {};

if (window.jQuery === undefined) jQuery = $ = {};

!function($, window, document)
{
	Kvm.Loader = {
		files: [],
		directories: [],

		loadSuccess: false,
		zipFilesRead: 0,
		zipFiles: [],
		
		readZipFile: function(){
			if(this.zipFilesRead >= this.zipFiles.length) {
				if(this.loadSuccess) this.loadSuccess();
				return;
			}

			writer = new zip.BlobWriter();
			var entry = this.zipFiles[this.zipFilesRead];
			if(entry.directory)
			{
				this.directories[entry.filename] = {
					name: entry.filename
				};
				this.zipFilesRead++;
				this.readZipFile();
			}
			else
			{
				entry.getData(writer, function(blob) {
					var fileReader     = new FileReader();
					fileReader.onload  = function(event) {
						Kvm.Loader.files[entry.filename] = {
							name: entry.filename,
							size: entry.uncompressedSize,
							data: event.target.result
						};

						Kvm.Loader.zipFilesRead++;
						Kvm.Loader.readZipFile();
					};
					fileReader.readAsArrayBuffer(blob);
				});
			}
		},

		loadJar: function(base64Blob, loadSuccess)
		{
			this.loadSuccess = loadSuccess;

			zip.useWebWorkers = false;
			zip.createReader(new zip.Data64URIReader(base64Blob), function(zipReader) {
				zipReader.getEntries(function(entries) {
					Kvm.Loader.zipFiles = entries;
					Kvm.Loader.zipFilesRead = 0;
					Kvm.Loader.readZipFile();
				});
			});
		}
	};

    Kvm.ClassViewModel = function(klass){
    	this.__proto__ = klass;
    	this.getConstant = function(index){ return klass.constantPool[index]; }
    	this.getConstantString = function(index){ return klass.constantPool[index].bytes; }
    	this.getConstantName = function(index){ 
    		var constant = this.getConstant(index);
    		return this.getConstantString(constant.nameIndex);
    	}

    	this.getClassNameDescription = function(index){ 
    		var constant = this.getConstant(index);

			var targetClass = this.getConstant(constant.classIndex);
			var targetName = this.getConstant(constant.nameTypeIndex);

			var targetClassName = this.getConstantString(targetClass.nameIndex);
			var targetNameName = this.getConstantString(targetName.nameIndex);
			var targetNameDescription = this.getConstantString(targetName.descriptorIndex);

			return { class: targetClassName, name: targetNameName, description: targetNameDescription };
    	}
    	this.getMethodName = function(methodIndex){ return this.getConstantString(this.methods[methodIndex].nameIndex); }
    	this.getMethodDescription = function(methodIndex){ return this.getConstantString(this.methods[methodIndex].descriptorIndex); }
    	this.getMethodCode = function(method)
    	{
    		for(var i=0;i<method.attributesCount;i++)
			{
				if(this.getConstantString(method.attributes[i].attributeNameIndex) == 'Code')
				{
					code = method.attributes[i].code;
					return code;
				}
			}
    	}
    	this.getMethodAccess = function(method)
    	{
    		var flags = method.accessFlags;
    		var flagsArray = [];

    		if((flags & 0x1) !== 0) flagsArray.push('public');
    		if((flags & 0x2) !== 0) flagsArray.push('private');
    		if((flags & 0x4) !== 0) flagsArray.push('protected');
    		if((flags & 0x8) !== 0) flagsArray.push('static');
    		if((flags & 0x10) !== 0) flagsArray.push('final');
    		if((flags & 0x20) !== 0) flagsArray.push('sync');
    		if((flags & 0x40) !== 0) flagsArray.push('bridge');
    		if((flags & 0x80) !== 0) flagsArray.push('varargs');
    		if((flags & 0x100) !== 0) flagsArray.push('native');
    		if((flags & 0x400) !== 0) flagsArray.push('abstract');
    		if((flags & 0x800) !== 0) flagsArray.push('strict');
    		if((flags & 0x1000) !== 0) flagsArray.push('syntetic');

    		return flagsArray.join(' ');
    	}

    	this.name = this.getConstantString(this.constantPool[this.thisClass].nameIndex);
    	this.parent = this.getConstantString(this.constantPool[this.superClass].nameIndex);

    	this.findMethod = function(name, description) {
    		for(var i=0;i<klass.methodsCount;i++) 
    		{
    			if(description!==undefined)
    			{
    				if(this.getMethodName(i) == name && this.getMethodDescription(i) == description)
    					return this.methods[i];
    			}
    			else
    			{
    				if(this.getMethodName(i) == name)
    					return this.methods[i];
    			}
    		}

    		return undefined;
    	}

    	this.findMethodByOffcet = function(offcet)
    	{
    		for(var i=0;i<klass.methodsCount;i++) 
    		{
    			var method = klass.methods[i];

    			for(var j=0;j<method.attributesCount;j++)
				{
					if(this.getConstantString(method.attributes[j].attributeNameIndex) == 'Code')
					{
						var codeAttribute = method.attributes[j];

						if(codeAttribute.codeOffset<=offcet && codeAttribute.codeOffset+codeAttribute.codeLength>=offcet)
						{
							return method;
						}
					}
				}
    		}

    		return undefined;
    	}
    };

    Kvm.MachineConstants = {
    	opecodeNames: [
    		"nop", "aconst_null", "iconst_m1", "iconst_0", "iconst_1", 
		    "iconst_2", "iconst_3", "iconst_4", "iconst_5", "lconst_0", 
		    "lconst_1", "fconst_0", "fconst_1", "fconst_2", "dconst_0", 
		    "dconst_1", "bipush", "sipush", "ldc", "ldc_w", "ldc2_w", "iload", 
		    "lload", "fload", "dload", "aload", "iload_0", "iload_1", "iload_2", 
		    "iload_3", "lload_0", "lload_1", "lload_2", "lload_3", "fload_0", 
		    "fload_1", "fload_2", "fload_3", "dload_0", "dload_1", "dload_2", 
		    "dload_3", "aload_0", "aload_1", "aload_2", "aload_3", "iaload", 
		    "laload", "faload", "daload", "aaload", "baload", "caload", "saload", 
		    "istore", "lstore", "fstore", "dstore", "astore", "istore_0", 
		    "istore_1", "istore_2", "istore_3", "lstore_0", "lstore_1", 
		    "lstore_2", "lstore_3", "fstore_0", "fstore_1", "fstore_2", 
		    "fstore_3", "dstore_0", "dstore_1", "dstore_2", "dstore_3", 
		    "astore_0", "astore_1", "astore_2", "astore_3", "iastore", "lastore", 
		    "fastore", "dastore", "aastore", "bastore", "castore", "sastore", 
		    "pop", "pop2", "dup", "dup_x1", "dup_x2", "dup2", "dup2_x1", 
		    "dup2_x2", "swap", "iadd", "ladd", "fadd", "dadd", "isub", "lsub", 
		    "fsub", "dsub", "imul", "lmul", "fmul", "dmul", "idiv", "ldiv", 
		    "fdiv", "ddiv", "irem", "lrem", "frem", "drem", "ineg", "lneg", 
		    "fneg", "dneg", "ishl", "lshl", "ishr", "lshr", "iushr", "lushr", 
		    "iand", "land", "ior", "lor", "ixor", "lxor", "iinc", "i2l", "i2f", 
		    "i2d", "l2i", "l2f", "l2d", "f2i", "f2l", "f2d", "d2i", "d2l", "d2f", 
		    "i2b", "i2c", "i2s", "lcmp", "fcmpl", "fcmpg", 
		    "dcmpl", "dcmpg", "ifeq", "ifne", "iflt", "ifge", "ifgt", "ifle", 
		    "if_icmpeq", "if_icmpne", "if_icmplt", "if_icmpge", "if_icmpgt", 
		    "if_icmple", "if_acmpeq", "if_acmpne", "goto", "jsr", "ret", 
		    "tableswitch", "lookupswitch", "ireturn", "lreturn", "freturn", 
		    "dreturn", "areturn", "return", "getstatic", "putstatic", "getfield", 
		    "putfield", "invokevirtual", "invokespecial", "invokestatic", 
		    "invokeinterface", "<illegal opcode>", "new", "newarray", "anewarray", 
		    "arraylength", "athrow", "checkcast", "instanceof", "monitorenter", 
		    "monitorexit", "wide", "multianewarray", "ifnull", "ifnonnull", 
		    "goto_w", "jsr_w", "breakpoint", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", "<illegal opcode>", 
		    "<illegal opcode 253>", "impdep1", "impdep2"],

		arrayTypeMap: {
			4: 'bool',
			5: 'char',
			6: 'float',
			7: 'double',
			8: 'byte',
			9: 'short',
			10: 'int',
			11: 'long'
		}
    };

    Kvm.MachineMemory = {
    	pool: [],
		poolEmptyIndexes: [],
		staticVariables: {},
		staticClassState: {},
		threads: [],
		threadsImptyIndexes: [],
		activeThreadIndex: -1,
		threadsCounter: 0,

		loopTimerTargetFps: 15,
		loopTimerDelay: 0,
		loopTimerActive: false,
		loopTimer: null,

		createPoolVariable: function(value)
		{
			if(this.poolEmptyIndexes.length > 0)
			{
				var index = this.poolEmptyIndexes.pop();
				this.pool[index] = value;
				return index;
			}

			return this.pool.push(value)-1;
		},

		removePoolVariable: function(index)
		{
			this.pool[index] = undefined;
			this.poolEmptyIndexes.push(index);
		},

		getPoolVariable: function(index)
		{
			return this.pool[index];
		},

		setPoolVariable: function(index, value)
		{
			this.pool[index] = value;
		},

		haveStaticVariable: function(name)
		{
			return this.staticVariables[name]!==undefined;
		},
		setStaticVariable: function(name, value)
		{
			if(value === undefined) 
				throw new Error('here');
			this.staticVariables[name] = value;
		},
		getStaticVariable: function(name)
		{
			return this.staticVariables[name];
		},

		haveStaticClass: function(className)
		{
			return this.staticClassState[className]!==undefined;
		},
		getStaticClassReady: function(className)
		{
			return this.staticClassState[className];
		},
		staticClassInitiated: function(className)
		{
			return this.staticClassState[className] = true;
		},
		staticClassInitiating: function(className)
		{
			return this.staticClassState[className] = false;
		},

		registerThread: function(thread)
		{
			thread.uniqueThread = this.threadsCounter;
			this.threadsCounter++;

			if(this.threadsImptyIndexes.length > 0)
			{
				var index = this.threadsImptyIndexes.pop();
				this.threads[index] = value;
				return index;
			}

			return this.threads.push(thread)-1;
		},
		unregisterThread: function(index)
		{
			this.threads[index] = undefined;
			this.threadsImptyIndexes.push(index);
		},
		sortThreads: function()
		{
			var activeThread = this.threads[this.activeThreadIndex];

			this.threads.sort(function(a,b)
			{
				return a.priority - b.priority;
			});

			this.activeThreadIndex = this.threads.indexOf(activeThread);
		},
		startThreadsLoop: function()
		{
			var loopTimerInterval = 15;
			var loopCounter = 0;
			this.activeThreadIndex = 0;

			this.loopTimer = setInterval(function(){

				if(loopCounter>8)
					clearInterval(Kvm.MachineMemory.loopTimer);

				if(Kvm.MachineMemory.loopTimerDelay <=0 && !Kvm.MachineMemory.loopTimerActive)
				{
					Kvm.Log.infoLine('Threads loop');
					loopCounter++;

					Kvm.MachineMemory.loopTimerDelay = Kvm.MachineMemory.loopTimerDelay + (1000 / Kvm.MachineMemory.loopTimerTargetFps);
					Kvm.MachineMemory.loopTimerActive = true;

					while(Kvm.MachineMemory.threads.length > 0)
					{
						var thread = Kvm.MachineMemory.threads[Kvm.MachineMemory.activeThreadIndex];

						if(thread.status == 'active')
						{
							Kvm.Log.toThread(thread.uniqueThread);
							Kvm.Log.infoLine('Thread active');
							var response = false;

							if(thread.state!==undefined)
							{
								Kvm.Log.increaseThreadDepth();
								response = Kvm.Machine.runMethod(undefined, undefined, undefined, undefined, undefined, thread.state);
								Kvm.Log.decreaseThreadDepth();
							}
							else 
							{
								Kvm.Log.increaseThreadDepth();
								response = Kvm.Machine.runMethod(thread.threadArgument, thread.method, thread.methodParameters);
								Kvm.Log.decreaseThreadDepth();
							}

							if(response.action == 'next-thread')
							{
								thread.state = response.state;
								Kvm.Log.infoLine('Thread yield');

								var nextThread = Kvm.MachineMemory.activeThreadIndex + 1;
								if(nextThread >= Kvm.MachineMemory.threads.length)
									nextThread = 0;
								Kvm.Log.threadJump(thread.uniqueThread, Kvm.MachineMemory.threads[nextThread].uniqueThread);
							}
							else if(response.action == 'sleep')
							{
								Kvm.MachineMemory.loopTimerDelay = response.value;
								thread.state = response.state;
								Kvm.Log.infoLine('Thread sleep');
								break;
							}
						}
						
						Kvm.MachineMemory.activeThreadIndex++;
						if(Kvm.MachineMemory.activeThreadIndex >= Kvm.MachineMemory.threads.length) 
						{
							Kvm.Log.infoLine('Threads loop delay');
							Kvm.MachineMemory.activeThreadIndex = 0;
							break;
						}
					}

					Kvm.MachineMemory.loopTimerActive = false;
				}

				Kvm.MachineMemory.loopTimerDelay -= loopTimerInterval;

			},loopTimerInterval);
		}
    };

	Kvm.Machine = {
		classNames: [],

		initStaticClass(className)
		{
			if(this.classNames.includes(className))
			{
				var instance = { type: 'class', class: Kvm.Core.classes[className] };
				var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
				instance.memoryIndex = instanceIndex;

				var staticConstructor = instance.class.findMethod('<clinit>');
				if(staticConstructor!==undefined)
				{
					this.runMethod(instance, staticConstructor, [instance.memoryIndex]);
				}

				Kvm.MachineMemory.removePoolVariable(instanceIndex);
			}
			else Kvm.Log.errorLine('unknown class: '+className);
		},

		initClasses(classList)
		{
			this.classNames = Object.keys(classList);
		},

		runMidlet: function(klass)
		{
			Kvm.Log.increaseThreadDepth();
			this.initStaticClass(klass.name);
			Kvm.Log.decreaseThreadDepth();

			var instance = { type: 'class', class: klass };
			var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
			instance.memoryIndex = instanceIndex;

			var constructor = klass.findMethod('<init>');
			Kvm.Log.increaseThreadDepth();
			this.runMethod(instance, constructor, [instance.memoryIndex]);
			Kvm.Log.decreaseThreadDepth();

			var instanceMidlet = { type: 'midlet-thread', class: null };
			var instanceIndexMidlet = Kvm.MachineMemory.createPoolVariable(instanceMidlet);
			instanceMidlet.memoryIndex = instanceIndex;
			instanceMidlet.thread = {};
			instanceMidlet.threadArgument = instance;
			instanceMidlet.methodParameters = [instance.memoryIndex];
			instanceMidlet.status = 'active';
			instanceMidlet.method = klass.findMethod('startApp');
			instanceMidlet.priority = 5;

			var threadIndex = Kvm.MachineMemory.registerThread(instanceMidlet);
			instanceMidlet.threadIndex = threadIndex;

			Kvm.MachineMemory.startThreadsLoop();
		},

		createFrame: function(parameters)
		{
			return {
				stack: [],
				variables: parameters || [],

				push: function(value)
				{
					//Kvm.Log.infoLine('push: '+value);
					this.stack.push(value);
				},
				pop: function()
				{
					var value = this.stack.pop();
					//Kvm.Log.infoLine('pop: '+value);
					return value;
				}
			};
		},

		runMethod: function(variable, method, parameters, frame, operationIndex, falldown)
		{
			var haveFalldown = falldown !== undefined;
			if(falldown !== undefined)
			{
				if(variable === undefined)
				{
					variable = falldown.variable;
					method = falldown.method;
					parameters = falldown.parameters;
					frame = falldown.frame;
					operationIndex = falldown.operationIndex;
					falldown = falldown.fallback;
				}
			}
			else
			{
				operationIndex = 0;
				frame = this.createFrame(parameters);
				//frame.variable[0] = variable.memoryIndex;
			}

			var code = variable.class.getMethodCode(method);
			var access = variable.class.getMethodAccess(method);

			var thisMethodName = variable.class.getConstantString(method.nameIndex);
			var thisMethodDescription = variable.class.getConstantString(method.descriptorIndex);
			var thisMethodOutputName = access+' '+variable.class.name+'::'+thisMethodName+thisMethodDescription;

			if(haveFalldown)
				Kvm.Log.debugInfoLine('continue: '+thisMethodOutputName);
			else
				Kvm.Log.debugInfoLine('start: '+thisMethodOutputName);

			for(var i=operationIndex;i<code.length;i++)
			{
				var postOperation = false;

				if(falldown !== undefined)
				{
					postOperation = this.runMethod(undefined, undefined, undefined, undefined, undefined, falldown);
					falldown = undefined;
				}
				else
				{
					postOperation = this.runInstruction(code[i], frame, variable);
				}

				if(postOperation!==false)
				{
					if(postOperation.action == 'return') break;
					else if(postOperation.action == 'goto')
					{
						postOperation.offcet += code[i].pc;

						var foundOffcet = false;
						for(var j=0;j<code.length;j++)
						{
							if(code[j].pc == postOperation.offcet)
							{
								i = j - 1;
								foundOffcet = true;
								break;
							}
						}

						if(foundOffcet) continue;

						Kvm.Log.errorLine(postOperation);
						Kvm.Log.errorLine(code[i]);
						Kvm.Log.errorLine(code);
						Kvm.Log.errorLine(thisMethodOutputName);

						throw new Error("unfinished code");
					}
					else if(postOperation.action == 'next-thread')
					{
						var threadState = {
							//operationIndex: i + 1,
							operationIndex: (postOperation.state===undefined? (i+1) : i),
							frame: frame,
							variable: variable,
							method: method,
							parameters: parameters,
							fallback: postOperation.state
						};

						return { action: 'next-thread', reason: postOperation.reason, state: threadState };
					}
					else if(postOperation.action == 'sleep')
					{
						var threadState = {
							operationIndex: i + 1,
							frame: frame,
							variable: variable,
							method: method,
							parameters: parameters,
							fallback: postOperation.state
						};

						return { action: 'sleep', reason: postOperation.reason, value: postOperation.value, state: threadState };
					}
					else
					{
						Kvm.Log.errorLine(postOperation);
						throw new Error("unknown post operation");
					}
				}
			}

			Kvm.Log.debugInfoLine('end: '+thisMethodOutputName);
			return false;
		},

		runInstruction: function(instruction, frame, variable)
		{
			var opecodeName = Kvm.MachineConstants.opecodeNames[instruction.opecode];
			var debug = opecodeName+'';
			var debugValue = null;

			switch(opecodeName)
			{
				case 'new':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var targetType = variable.class.getConstantName(constantIndex);
					debugValue = '<< '+targetType;

					var ref = this._runMemoryAllocate(targetType, frame, variable);
					frame.push(ref);
					debugValue = debugValue+' ref '+ref;
					break;

				case 'anewarray':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var targetType = variable.class.getConstantName(constantIndex);
					var count = frame.pop();
					debugValue = '>> '+count+', << '+targetType + ' [ '+count+' ]';

					var instance = { type: 'array', dimension: 1, elementType: targetType, value: new Array(count) };
					var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
					instance.memoryIndex = instanceIndex;

					debugValue = debugValue+' ref '+instanceIndex;

					frame.push(instanceIndex);
					break;

				case 'newarray':
					var typeIndex = instruction.operand[0];
					var count = frame.pop();

					debugValue = '>> '+count+', << '+Kvm.MachineConstants.arrayTypeMap[typeIndex] + ' [ '+count+' ]';

					var instance = { type: 'array', dimension: 1, elementType: Kvm.MachineConstants.arrayTypeMap[typeIndex], value: new Array(count) };
					var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
					instance.memoryIndex = instanceIndex;

					debugValue = debugValue+' ref '+instanceIndex;

					frame.push(instanceIndex);
					break;

				case 'multianewarray':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var dimensions = instruction.operand[2];

					var targetType = variable.class.getConstantName(constantIndex);
					var counts = [];
					debugValue = '';
					for(var i=0;i<dimensions;i++)
					{
						let localCount = frame.pop();
						debugValue = debugValue + '>> '+localCount+', ';
						counts.push(localCount);
					}
					debugValue = debugValue + '<< '+targetType;

					var ref = this._runMemoryAllocateArray(targetType, counts, frame, variable);
					debugValue = debugValue+' ref '+ref;
					break;
				
				case 'iastore':
					var value = frame.pop();
					var index = frame.pop();
					var arrayRef = frame.pop();

					debugValue = '<< value '+value+', << index '+index+', << arrayRef '+arrayRef;

					var arr = Kvm.MachineMemory.getPoolVariable(arrayRef);
					arr.value[index] = value;
					break;

				case 'sastore':
					var value = frame.pop();
					var index = frame.pop();
					var arrayRef = frame.pop();

					debugValue = '<< value '+value+', << index '+index+', << arrayRef '+arrayRef;

					var arr = Kvm.MachineMemory.getPoolVariable(arrayRef);
					arr.value[index] = value;
					break;

				case 'bastore':
					var value = frame.pop();
					var index = frame.pop();
					var arrayRef = frame.pop();

					debugValue = '<< value '+value+', << index '+index+', << arrayRef '+arrayRef;

					var arr = Kvm.MachineMemory.getPoolVariable(arrayRef);
					arr.value[index] = value;
					break;

				case 'invokespecial':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);
					debugValue = constant.class+'::'+constant.name+constant.description;
					Kvm.Log.debugLine(debug, instruction.pc, debugValue);
					return this._runInvokeSpecial(constant.class, constant.name, constant.description, frame, variable);
					break;

				case 'invokevirtual':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);
					debugValue = constant.class+'::'+constant.name+constant.description;
					Kvm.Log.debugLine(debug, instruction.pc, debugValue);
					return this._runInvokeVirtual(constant.class, constant.name, constant.description, frame, variable);
					break;

				case 'invokestatic':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);
					debugValue = constant.class+'::'+constant.name+constant.description;
					Kvm.Log.debugLine(debug, instruction.pc, debugValue);
					return this._runInvokeStatic(constant.class, constant.name, constant.description, frame, variable);
					break;

				case 'putstatic':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);

					var variableName = constant.class+'::'+constant.name+' as '+constant.description;
					var paramType = this._getDescriptionDetails(constant.description).type;

					if(!Kvm.MachineMemory.haveStaticClass(constant.class))
					{
						Kvm.MachineMemory.staticClassInitiating(constant.class);
						Kvm.Log.infoLine(debug+' [init]');
						Kvm.Log.infoLine('no static variable: '+variableName);
						Kvm.Log.infoLine('trying init');
						Kvm.Log.increaseThreadDepth();
						this.initStaticClass(constant.class);
						Kvm.Log.decreaseThreadDepth();
						Kvm.Log.infoLine(debug+' [ready]');
						Kvm.MachineMemory.staticClassInitiated(constant.class);
					}

					debugValue = 'set '+variableName+' ';

					if(paramType.startsWith('reference:'))
					{
						var poolIndex = frame.pop();
						debugValue = '<< '+poolIndex+', '+debugValue + 'to ref '+poolIndex;

						if(poolIndex === null)
							Kvm.MachineMemory.setStaticVariable(variableName, null);
						else 
							Kvm.MachineMemory.setStaticVariable(variableName, Kvm.MachineMemory.getPoolVariable(poolIndex));
					}
					else 
					{
						var value = frame.pop();
						debugValue = '<< '+value+', '+debugValue + 'to '+value;

						Kvm.MachineMemory.setStaticVariable(variableName, value);
					}
					break;

				case 'getstatic':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);

					var variableName = constant.class+'::'+constant.name+' as '+constant.description;
					var paramType = this._getDescriptionDetails(constant.description).type;

					//debug+=' : '+variableName;

					if(!Kvm.MachineMemory.haveStaticClass(constant.class))
					{
						Kvm.MachineMemory.staticClassInitiating(constant.class);
						Kvm.Log.infoLine(debug+' [init]');
						Kvm.Log.infoLine('no static variable: '+variableName);
						Kvm.Log.infoLine('trying init');
						Kvm.Log.increaseThreadDepth();
						this.initStaticClass(constant.class);
						Kvm.Log.decreaseThreadDepth();
						Kvm.Log.infoLine(debug+' [ready]');
						Kvm.MachineMemory.staticClassInitiated(constant.class);
					}

					if(Kvm.MachineMemory.haveStaticVariable(variableName))
					{
						var staticVariable = Kvm.MachineMemory.getStaticVariable(variableName);

						if(staticVariable === null)
						{
							debugValue = '>> '+staticVariable+', '+variableName;
							frame.push(staticVariable);
						}
						else if(paramType.startsWith('reference:'))
						{
							debugValue = '>> ref '+staticVariable.memoryIndex+', '+variableName;
							frame.push(staticVariable.memoryIndex);
						}
						else
						{
							debugValue = '>> '+staticVariable+', '+variableName;
							frame.push(staticVariable);
						}
					}
					else
					{
						Kvm.Log.errorLine('no static variable: '+variableName);
					}
					break;

				case 'idiv':
					var value2 = frame.pop();
					var value1 = frame.pop();
					var result = Math.floor(value1/value2);

					debugValue = '<< '+value2+', << '+value1+', >> '+result;
					frame.push(result);
					break;

				case 'iadd':
					var value2 = frame.pop();
					var value1 = frame.pop();
					var result = value1+value2;

					debugValue = '<< '+value2+', << '+value1+', >> '+result;
					frame.push(result);
					break;

				case 'ldc':
					var constant = variable.class.getConstant(instruction.operand[0]);

					// TODO: different types support. by default there are int or float, but string/object might be too
					var string = variable.class.getConstantString(constant.stringIndex);
					var index = Kvm.MachineMemory.createPoolVariable(string);

					debugValue = '( const '+instruction.operand[0]+' to '+string+' ), >> ref '+index;
					frame.push(index);
					break;

				case 'ldc2_w':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getConstant(constantIndex);

					var value = constant.highBytes * 4294967296 + constant.lowBytes;
					frame.push(value);

					debugValue = '( const '+constantIndex+' to long/double ), >> '+value;
					break;

				case 'aload_0':
					debugValue = '>> ref '+frame.variables[0];
					frame.push(frame.variables[0]);
					break;

				case 'aload_1':
					debugValue = '>> ref'+frame.variables[1];
					frame.push(frame.variables[1]);
					break;

				case 'aload_2':
					debugValue = '>> ref'+frame.variables[2];
					frame.push(frame.variables[2]);
					break;

				case 'aload_3':
					debugValue = '>> ref'+frame.variables[3];
					frame.push(frame.variables[3]);
					break;

				case 'iload_0':
					debugValue = '>> '+frame.variables[0];
					frame.push(frame.variables[0]);
					break;
				case 'iload_1':
					debugValue = '>> '+frame.variables[1];
					frame.push(frame.variables[1]);
					break;
				case 'iload_2':
					debugValue = '>> '+frame.variables[2];
					frame.push(frame.variables[2]);
					break;
				case 'iload_3':
					debugValue = '>> '+frame.variables[3];
					frame.push(frame.variables[3]);
					break;

				case 'istore_0':
					frame.variables[0] = frame.pop();
					debugValue = '<< '+frame.variables[0];
					break;
				case 'istore_1':
					frame.variables[1] = frame.pop();
					debugValue = '<< '+frame.variables[1];
					break;
				case 'istore_2':
					frame.variables[2] = frame.pop();
					debugValue = '<< '+frame.variables[2];
					break;
				case 'istore_3':
					frame.variables[3] = frame.pop();
					debugValue = '<< '+frame.variables[3];
					break;

				case 'astore_0':
					frame.variables[0] = frame.pop();
					debugValue = '<< ref'+frame.variables[0];
					break;
				case 'astore_1':
					frame.variables[1] = frame.pop();
					debugValue = '<< ref'+frame.variables[1];
					break;
				case 'astore_2':
					frame.variables[2] = frame.pop();
					debugValue = '<< ref'+frame.variables[2];
					break;
				case 'astore_3':
					frame.variables[3] = frame.pop();
					debugValue = '<< ref'+frame.variables[3];
					break;

				case 'nop': break;
				case 'impdep1': break; // reserved
				case 'impdep2': break; // reserved

				case 'aconst_null': frame.push(null); debugValue = '>> null'; break;
				case 'iconst_m1': frame.push(-1); debugValue = '>> -1'; break;
				case 'iconst_0': frame.push(0); debugValue = '>> 0'; break;
				case 'iconst_1': frame.push(1); debugValue = '>> 1'; break;
				case 'iconst_2': frame.push(2); debugValue = '>> 2'; break;
				case 'iconst_3': frame.push(3); debugValue = '>> 3'; break;
				case 'iconst_4': frame.push(4); debugValue = '>> 4'; break;
				case 'iconst_5': frame.push(5); debugValue = '>> 5'; break;
				case 'lconst_0': frame.push(0); debugValue = '>> 0'; break;
				case 'lconst_1': frame.push(1); debugValue = '>> 1'; break;
				case 'bipush': 
					var value = this._toSignedByte(instruction.operand[0]);
					frame.push(value); 
					debugValue = '( '+value+' ) >> '+value; 
					break;
				case 'sipush': 
					var value = instruction.operand[0]*256+instruction.operand[1];
					debugValue = '( '+value+' ) >> '+value; 
					frame.push(value); 
					break;
				case 'pop': 
					var value = frame.pop(); 
					debugValue = '<< '+value;
					break;
				case 'dup': var value = frame.pop(); 
					debugValue = '<< '+value+', >> '+value+', >> '+value;
					frame.push(value); frame.push(value); break;

				case 'return': 
					Kvm.Log.debugLine(debug, instruction.pc, debugValue);
					return { action: 'return' };

				case 'checkcast': 
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getConstantName(constantIndex);

					var reference = frame.pop();
					debugValue = '<< ref '+reference;
					if(reference === null)
					{
						debugValue = debugValue + ', >> ref null';
						frame.push(null);
					}
					else
					{
						var pointedObject = Kvm.MachineMemory.getPoolVariable(reference);
						Kvm.Log.errorLine(pointedObject);
						throw new Error("unready code");
					}
					break;

				case 'lookupswitch':
					var targetKey = frame.pop(); 
					debugValue = '<< '+targetKey;
					//debug+=' : '+targetKey;
					var params = instruction.operand;

					var alignOffcet = params.length%4;
					var defaultOffcet = params[alignOffcet+0]*16777216 + params[alignOffcet+1]*65536 + params[alignOffcet+2]*256 + params[alignOffcet+3];
					var count = params[alignOffcet+4]*16777216 + params[alignOffcet+5]*65536 + params[alignOffcet+6]*256 + params[alignOffcet+7];
					var map = {};

					for(var i=0;i<count;i++)
					{
						var value = params[alignOffcet+8+i*8]*16777216 + 
									params[alignOffcet+9+i*8]*65536 + 
									params[alignOffcet+10+i*8]*256 + 
									params[alignOffcet+11+i*8];

						var key = params[alignOffcet+12+i*8]*16777216 + 
								  params[alignOffcet+13+i*8]*65536 + 
								  params[alignOffcet+14+i*8]*256 + 
								  params[alignOffcet+15+i*8];

						if(value > 2147483647) value -= 4294967296;
						if(key > 2147483647) key -= 4294967296;

						map[value] = key;
					}

					if(map[targetKey]!== undefined)
					{
						debugValue = debugValue+', have offset, '+map[targetKey];
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'lookupswitch', offcet: map[targetKey] };
					}
					else 
					{
						debugValue = debugValue+', no offset, '+defaultOffcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'lookupswitch', offcet: defaultOffcet };
					}
					return;

				case 'goto':
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					if(offcet > 32767) offcet -= 65536;
					debugValue = '( '+offcet+' )';
					Kvm.Log.debugLine(debug, instruction.pc, debugValue);
					return { action: 'goto', reason: 'goto', offcet: offcet };

				case 'ifne': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					debugValue = '<< '+value + ', val != 0';
					if(value != 0) 
					{
						debugValue = debugValue +', offset '+offcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'if', offcet: offcet };
					}
					break;
				case 'ifeq': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					debugValue = '<< '+value + ', val == 0';
					if(value === 0) 
					{
						debugValue = debugValue +', offset '+offcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'if', offcet: offcet };
					}
					break;
				case 'iflt': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					debugValue = '<< '+value + ', val < 0';
					if(value < 0) 
					{
						debugValue = debugValue +', offset '+offcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'if', offcet: offcet };
					}
					break;
				case 'ifle': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					debugValue = '<< '+value + ', val <= 0';
					if(value <= 0) 
					{
						debugValue = debugValue +', offset '+offcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'if', offcet: offcet };
					}
					break;
				case 'ifgt': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					debugValue = '<< '+value + ', val > 0';
					if(value > 0) 
					{
						debugValue = debugValue +', offset '+offcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'if', offcet: offcet };
					}
					break;
				case 'ifge': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					debugValue = '<< '+value + ', val >= 0';
					if(value >= 0)
					{
						debugValue = debugValue +', offset '+offcet;
						Kvm.Log.debugLine(debug, instruction.pc, debugValue);
						return { action: 'goto', reason: 'if', offcet: offcet };
					}
					break;

				case 'monitorenter':
					// todo: sync implementation
					var value = frame.pop(); 
					debugValue = '<< '+value + ' lock/sync';
					break;
				case 'monitorexit':
					// todo: sync implementation
					var value = frame.pop(); 
					debugValue = '<< '+value + ' unlock/end of sync';
					break;

				default: 
					Kvm.Log.errorLine('unknown instruction: '+opecodeName+' as 0x'+instruction.opecode.toString(16));
					throw new Error('here');
					break;
			}

			Kvm.Log.debugLine(debug, instruction.pc, debugValue);
			return false;
		},

		_toSignedByte: function(val)
		{
			while(val < -128) val = val + 256;
			while(val > 127) val = val - 256;
			return val;
		},

		_runMemoryAllocate: function(type, frame, variable)
		{
			var instance = { type: 'object', class: type };
			var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
			instance.memoryIndex = instanceIndex;

			if(type=='java/lang/Thread')
			{

			}
			else if(type=='javax/microedition/lcdui/Display')
			{

			}
			else if(Kvm.Core.classes[type]!==undefined)
			{
				instance.type = 'class';
				instance.class = Kvm.Core.classes[type];

				var constructor = instance.class.findMethod('<init>');
				this.runMethod(instance, constructor, [instance.memoryIndex]);
			}
			else
			{
				Kvm.Log.errorLine('unknown type allocation: '+type);
			}

			return instanceIndex;
		},

		_runMemoryAllocateArray: function(type, counts, frame, variable)
		{
			type = type.substring(counts.length);
			var details = this._getDescriptionDetails(type);

			var arrayMaker = function(dimensions){
				var array = new Array(dimensions[0]);
				if(dimensions.length > 1)
				{
					var subdimension = dimensions.slice(1);

					for(var i=0;i<array.length;i++)
					{
						array[i] = arrayMaker(subdimension);
					}
				}
				return array;
			}

			var instance = { type: 'array', dimension: counts.length, elementType: details.type, value: arrayMaker(counts) };
			var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
			instanceIndex.memoryIndex = instanceIndex;

			frame.push(instanceIndex);

			return instanceIndex;
		},

		_runInvokeSpecial: function(className, methodName, methodDescription, frame, variable)
		{
			return this._runInvokeFallback('special', className, methodName, methodDescription, frame, variable);
		},

		_runInvokeVirtual: function(className, methodName, methodDescription, frame, variable)
		{
			return this._runInvokeFallback('virtual', className, methodName, methodDescription, frame, variable);
		},

		_runInvokeStatic: function(className, methodName, methodDescription, frame, variable)
		{
			return this._runInvokeFallback('static', className, methodName, methodDescription, frame, variable);
		},

		_getDescriptionDetails: function(description)
		{
			var functionParams = null;
			var result = [];

			var arrayDepth = 0;

			for(var i=0;i<description.length;i++)
			{
				if(description[i] == '(')
				{
					functionParams = [];
					continue;
				}

				if(description[i] == ')')
				{
					functionParams = result;
					result = [];
					continue;
				}

				if(description[i] == '[')
				{
					arrayDepth++;
					continue;
				}

				if(description[i] == 'L')
				{
					className = '';
					for(var j=i+1;j<description.length;j++)
					{
						i++;
						if(description[j] == ';') break;
						className = className+description[j];
					}
					result.push('reference:'+className);
					continue;
				}

				if(description[i] == 'B') result.push('byte');
				if(description[i] == 'C') result.push('char');
				if(description[i] == 'D') result.push('double');
				if(description[i] == 'F') result.push('float');
				if(description[i] == 'I') result.push('int');
				if(description[i] == 'J') result.push('long');
				if(description[i] == 'S') result.push('short');
				if(description[i] == 'Z') result.push('bool');
				if(description[i] == 'V') result.push('void');

				if(arrayDepth > 0 && description[i] != '[')
				{
					var arraysSuffix = '';
					for(var j=0;j<arrayDepth;j++)
						arraysSuffix = arraysSuffix+'[]';

					result[result.length-1] = 'reference:'+result[result.length-1]+arraysSuffix;
				}
			}

			if(functionParams == null)
			{
				return {type:result[0]};
			}
			else
			{
				return {type:result[0], parameters: functionParams};
			}
		},

		_runInvokeFallback: function(mode, className, methodName, methodDescription, frame, variable)
		{
			var functionDetails = this._getDescriptionDetails(methodDescription);

			var outputType = functionDetails.type;
			var parameters = [];

			var debugValues = [];

			for(var i=0;i<functionDetails.parameters.length;i++)
			{
				var paramType = functionDetails.parameters[i];
				if(paramType.startsWith('reference:'))
				{
					var poolIndex = frame.pop();
					debugValues.push('<< ref '+poolIndex);
					parameters.push(Kvm.MachineMemory.getPoolVariable(poolIndex));
				}
				else 
				{
					var value = frame.pop();
					debugValues.push('<< '+value);
					parameters.push(value);
				}
			}

			if(mode == 'special' || mode == 'virtual')
			{
				var value = frame.pop();
				parameters.push(value);
				debugValues.push('<< this ref '+value);
			}

			if(debugValues.length > 0)
			{
				Kvm.Log.debugValueLine(debugValues.join(', '));
			}

			parameters.reverse();

			if(className == 'javax/microedition/midlet/MIDlet')
			{
				if(mode == 'special' && methodName == '<init>')
				{
					// what to do? by idea need init some values for variable
					return false;
				}
				if(mode == 'virtual' && methodName == 'getAppProperty')
				{
					var property = Kvm.Core.manifest[parameters[1]];
					var index = Kvm.MachineMemory.createPoolVariable(property);
					frame.push(index);
					Kvm.Log.debugValueLine('>> '+property+' as ref '+index);
					return false;
				}
			}
			else if(className == 'javax/microedition/lcdui/Display')
			{
				if(mode == 'static' && methodName == 'getDisplay')
				{
					var targetMidlet = Kvm.MachineMemory.getPoolVariable(parameters[0]);
					var ref = this._runMemoryAllocate('javax/microedition/lcdui/Display', frame, null);
					frame.push(ref);
					Kvm.Log.debugValueLine('>> ref '+ref);
					return false;
				}
				if(mode == 'virtual' && methodName == 'setCurrent')
				{
					var targetDisplay = Kvm.MachineMemory.getPoolVariable(parameters[0]);
					var targetValue = Kvm.MachineMemory.getPoolVariable(parameters[1]);
					targetDisplay.current = parameters[1];
					return false;
				}
			}
			else if(className == 'javax/microedition/lcdui/Canvas')
			{
				if(mode == 'special' && methodName == '<init>')
				{
					// what to do? by idea need init some values for variable
					return false;
				}
				if(mode == 'virtual' && methodName == 'setFullScreenMode')
				{
					variable.fullscreen = parameters[1];
					return false;
				}
				if(mode == 'virtual' && methodName == 'repaint')
				{
					// TODO: painting
					return false;
				}
				if(mode == 'virtual' && methodName == 'serviceRepaints')
				{
					// TODO: painting
					return false;
				}
			}
			else if(className == 'java/lang/Thread')
			{
				if(mode == 'special' && methodName == '<init>')
				{
					var targetInstance = Kvm.MachineMemory.getPoolVariable(parameters[0]);
					targetInstance.thread = {};
					targetInstance.threadArgument = parameters[1];
					targetInstance.status = 'ready';
					targetInstance.priority = Kvm.MachineMemory.threads[Kvm.MachineMemory.activeThreadIndex].priority;	// from parent
					return false;
				}
				if(mode == 'virtual' && methodName == 'start')
				{
					var targetInstance = Kvm.MachineMemory.getPoolVariable(parameters[0]);
					targetInstance.status = 'active';

					var targetMethod = targetInstance.threadArgument.class.findMethod('run');
					targetInstance.method = targetMethod;
					targetInstance.methodParameters = [targetInstance.threadArgument.memoryIndex];

					var threadIndex = Kvm.MachineMemory.registerThread(targetInstance);
					targetInstance.threadIndex = threadIndex;

					return false;
				}
				if(mode == 'virtual' && methodName == 'setPriority')
				{
					variable.priority = parameters[1];
					Kvm.MachineMemory.sortThreads();
					return false;
				}
				if(mode == 'static' && methodName == 'yield')
				{
					return { action: 'next-thread', reason: 'thread' };
				}
				if(mode == 'static' && methodName == 'currentThread')
				{
					Kvm.Log.debugValueLine('>> ref '+Kvm.MachineMemory.threads[Kvm.MachineMemory.activeThreadIndex].memoryIndex);
					frame.push(Kvm.MachineMemory.threads[Kvm.MachineMemory.activeThreadIndex].memoryIndex);
					return false;
				}
				if(mode == 'static' && methodName == 'sleep')
				{
					return { action: 'sleep', reason: 'thread', value: parameters[0] };
				}
			}
			else if(className == 'java/lang/System')
			{
				if(mode == 'static' && methodName == 'currentTimeMillis')
				{
					var time = new Date().getTime();
					Kvm.Log.debugValueLine('>> '+time);
					frame.push(time);
					return false;
				}
			}
			else if(Kvm.Core.classes[className]!==undefined)
			{
				if(mode == 'static')
				{
					var instance = { type: 'class', class: Kvm.Core.classes[className] };
					var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
					instance.memoryIndex = instanceIndex;

					var staticMethod = instance.class.findMethod(methodName, methodDescription);
					var staticMethodResponse = false;
					if(staticMethod!==undefined)
					{
						Kvm.Log.increaseThreadDepth();
						staticMethodResponse = this.runMethod(instance, staticMethod, parameters);
						Kvm.Log.decreaseThreadDepth();
					}

					Kvm.MachineMemory.removePoolVariable(instanceIndex);
					return staticMethodResponse;
				}
				else if(mode == 'special')
				{
					var targetInstance = Kvm.MachineMemory.getPoolVariable(parameters[0]);
					var targetMethod = targetInstance.class.findMethod(methodName, methodDescription);

					Kvm.Log.increaseThreadDepth();
					var result = this.runMethod(targetInstance, targetMethod, parameters);
					Kvm.Log.decreaseThreadDepth();
					return result
				}
			}

			Kvm.Log.errorLine(mode+' invoke unknown: '+className+'::'+methodName+methodDescription);
			throw new Error("unfinished code");
		}
	},

	Kvm.Log = {
		$tabs: null,
		$tabsContent: null,
		$parent: null,
		$activeTab: null,
		$activeTabContent: null,

		threadTabs: [],
		threadTabsContents: [],
		threadData: [],
		activeThread: 0,
		counter: 0,

		checkThreadExist: function(threadId)
		{
			if(this.threadData[threadId] == undefined)
			{
				this.threadData[threadId] = {
					lastCounter: 0,
					depth: 0
				};
			}

			if(this.threadTabs[threadId] == undefined)
			{
				this.$tabs.append('<div class="tab" threadId="'+threadId+'">Thread '+threadId+'</div>');
				this.threadTabs[threadId] = this.$tabs.find('.tab[threadId='+threadId+']');
				var _threadId = threadId;
				this.threadTabs[threadId].click(function(){
					Kvm.Log.toThread(_threadId);
				});
			}

			if(this.threadTabsContents[threadId] == undefined)
			{
				this.$tabsContent.append('<div class="tabContent" threadId="'+threadId+'"></div>');
				this.threadTabsContents[threadId] = this.$tabsContent.find('.tabContent[threadId='+threadId+']');
			}
		},

		toThread: function(threadId)
		{
			this.activeThread = threadId;
			this.checkThreadExist(threadId);

			this.$tabs.find('div').removeClass('active');
			this.$tabsContent.find('div').removeClass('active');

			this.$activeTab = this.threadTabs[threadId];
			this.$activeTab.addClass('active');

			this.$activeTabContent = this.threadTabsContents[threadId];
			this.$activeTabContent.addClass('active');
		},

		getThreadDepth(threadId)
		{
			if(threadId === undefined)
				threadId = this.activeThread;

			var padding = '';
			for(var q=0;q<this.threadData[threadId].depth;q++)
			{
				padding = padding+'&nbsp|&nbsp';
			}
			return padding;
		},

		threadJump(fromThread, toThread)
		{
			this.checkThreadExist(toThread);

			var fromThreadId = this.counter;
			this.counter++;
			var toThreadId = this.counter;
			this.counter++;

			this.threadTabsContents[fromThread].append('<div class="line jump" id="debug-'+fromThreadId+'" targetThead="'+toThread+'" targetId="debug-'+toThreadId+'">'+this.getThreadDepth()+' >> To Thread '+toThread+'</div>');
			this.threadTabsContents[toThread].append('<div class="line jump" id="debug-'+toThreadId+'" targetThead="'+fromThread+'" targetId="debug-'+fromThreadId+'">'+this.getThreadDepth()+' >> From Thread '+fromThread+'</div>');

			var clickFunction = function(){
				var targetThread = $(this).attr('targetThead');
				var targetId = $(this).attr('targetId');
				Kvm.Log.toThread(targetThread);

				var offset = Kvm.Log.threadTabsContents[targetThread].find('#'+targetId);
				Kvm.Log.$parent.scrollTop(offset.get(0).offsetTop);
			};

			this.threadTabsContents[fromThread].find('#debug-'+fromThreadId).click(clickFunction);
			this.threadTabsContents[toThread].find('#debug-'+toThreadId).click(clickFunction);
		},

		increaseThreadDepth()
		{
			this.threadData[this.activeThread].depth = this.threadData[this.activeThread].depth + 1;
		},

		decreaseThreadDepth()
		{
			this.threadData[this.activeThread].depth = this.threadData[this.activeThread].depth - 1;
		},

		errorLine: function(message)
		{
			if(this.$activeTabContent)
			{
				this.$activeTabContent.append('<div class="line error" id="debug-'+this.counter+'">'+this.getThreadDepth()+message+'</div>');

				this.threadData[this.activeThread].lastCounter = this.counter;
				this.counter++;
			}

			console.error(message);
		},

		infoLine: function(message)
		{
			if(this.$activeTabContent)
			{
				this.$activeTabContent.append('<div class="line info" id="debug-'+this.counter+'">'+this.getThreadDepth()+message+'</div>');

				this.threadData[this.activeThread].lastCounter = this.counter;
				this.counter++;
			}
		},

		debugInfoLine: function(message)
		{
			if(this.$activeTabContent)
			{
				this.$activeTabContent.append('<div class="line debugInfo" id="debug-'+this.counter+'">'+this.getThreadDepth()+message+'</div>');

				this.threadData[this.activeThread].lastCounter = this.counter;
				this.counter++;
			}
		},

		debugValueLine: function(message)
		{
			if(this.$activeTabContent)
			{
				this.$activeTabContent.append('<div class="line"><span class="lineNumber">'+this.getThreadDepth()+'</span><span class="lineValue">'+message+'</span></div>');
			}
		},

		debugLine: function(message, line, value)
		{
			if(this.counter == 739)
				this.counter = this.counter;

			if(this.$activeTabContent)
			{
				var append = '<div class="line debug" id="debug-'+this.counter+'"><span class="lineNumber">'+this.getThreadDepth()+line+'</span>'+message;
				if(value !== null && value !== undefined)
				{
					append = append + '<span class="lineValue">'+value+'</span>';
				}
				append = append + '</div>';
				this.$activeTabContent.append(append);

				this.threadData[this.activeThread].lastCounter = this.counter;
				this.counter++;
			}
		},

		init: function(parentSelector, tabsSelector, tabsContentSelector)
		{
			this.$parent = $(parentSelector);
			this.$tabs = $(tabsSelector);
			this.$tabsContent = $(tabsContentSelector);
		}
	}

	Kvm.Core = {
		manifest: {},

		name: false,
		icon: false,

		classes: {},

		run: function(base64Blob)
		{
			var parsed = Kvm.Loader.loadJar(base64Blob, function(){ Kvm.Core.loadSuccess(); });
		},

		loadManifest: function(content)
		{
			var lines = content.split("\n");
			for(var i=0;i<lines.length;i++)
			{
				var parts = lines[i].split(":", 2);

				this.manifest[parts[0]] = parts[1].trim();
			}

			var midletInfo = this.manifest['MIDlet-1'].split(', ', 3);
			this.name = midletInfo[0];
			this.icon = midletInfo[1].replace(/^\//g, '');	// remove leading slash in path
			var baseClass = midletInfo[2];

			Kvm.Log.toThread(0);
			Kvm.Machine.runMidlet(this.classes[baseClass]);
		},

		loadSuccess: function() {
			var files = Object.keys(Kvm.Loader.files);
			var classLoader = new JVM.ClassLoader();

			for(var i=0; i< files.length;i++)
			{
				if(files[i].endsWith('.class'))
				{
					try
					{
						var klass = classLoader.loadClass(Kvm.Loader.files[files[i]].data);
						klass = new Kvm.ClassViewModel(klass);
						var selfName = klass.name;

						this.classes[selfName] = klass;
					} catch (e) {
                		console.log(e);
            		}
				}
			}

			Kvm.Machine.initClasses(this.classes);

			var manifestData = Kvm.Loader.files['META-INF/MANIFEST.MF'].data;
			var manifestDataBlob = new Blob([manifestData]);

			var reader = new FileReader();
			reader.onload = function() {
				Kvm.Core.loadManifest(reader.result);
			};
			reader.readAsText(manifestDataBlob);
		}
	};
}
(window.jQuery, window, document);