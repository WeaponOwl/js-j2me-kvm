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
		threads: [],
		threadsImptyIndexes: [],
		activeThreadIndex: -1,

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

		registerThread: function(thread)
		{
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
		startThreadsLoop: function()
		{
			while(this.threads.length > 0)
			{
				this.activeThreadIndex = (this.activeThreadIndex + 1) % this.threads.length;
				var thread = this.threads[this.activeThreadIndex];

				if(thread.status == 'active')
				{
					if(thread.state!==undefined)
					{
						console.log(thread);
						throw new Error('no thread state realized');
					}

					var response = Kvm.Machine.runMethod(thread.threadArgument, thread.method);

					if(response.action == 'next-thread')
					{
						thread.state = response.state;
					}
				}
				else continue;
			}
		}
    };

	Kvm.Machine = {
		classNames: [],

		initStaticClass(className)
		{
			if(this.classNames.includes(className))
			{
				//console.log(className+' static loading');
				var instance = { type: 'class', class: Kvm.Core.classes[className] };
				var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
				instance.memoryIndex = instanceIndex;

				var staticConstructor = instance.class.findMethod('<clinit>');
				if(staticConstructor!==undefined)
					this.runMethod(instance, staticConstructor);

				Kvm.MachineMemory.removePoolVariable(instanceIndex);
				//console.log(className+' static loaded');
			}
			else console.log('unknown class: '+className);
		},

		initClasses(classList)
		{
			this.classNames = Object.keys(classList);
		},

		runMidlet: function(klass)
		{
			this.initStaticClass(klass.name);

			var instance = { type: 'class', class: klass };
			var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
			instance.memoryIndex = instanceIndex;

			var constructor = klass.findMethod('<init>');
			this.runMethod(instance, constructor);

			var instanceMidlet = { type: 'midlet-thread', class: null };
			var instanceIndexMidlet = Kvm.MachineMemory.createPoolVariable(instanceMidlet);
			instanceMidlet.memoryIndex = instanceIndex;
			instanceMidlet.thread = {};
			instanceMidlet.threadArgument = instance;
			instanceMidlet.status = 'active';
			instanceMidlet.method = klass.findMethod('startApp');
			instanceMidlet.priority = 1;

			var threadIndex = Kvm.MachineMemory.registerThread(instanceMidlet);
			instanceMidlet.threadIndex = threadIndex;

			Kvm.MachineMemory.startThreadsLoop();
		},

		runMethod: function(variable, method, parameters)
		{
			var code = null;
			var codeParentAttribute = null;
			var stackMap = null;

			var thisMethodName = variable.class.getConstantString(method.nameIndex);
			var thisMethodDescription = variable.class.getConstantString(method.descriptorIndex);
			var thisMethodOutputName = variable.class.name+'::'+thisMethodName+thisMethodDescription;

			//console.log('start: '+thisMethodOutputName);

			for(var i=0;i<method.attributesCount;i++)
			{
				if(variable.class.getConstantString(method.attributes[i].attributeNameIndex) == 'Code')
				{
					codeParentAttribute = method.attributes[i];
					code = method.attributes[i].code;

					for(var j=0;j<codeParentAttribute.attributesCount;j++)
					{
						if(variable.class.getConstantString(codeParentAttribute.attributes[i].attributeNameIndex) == 'StackMap')
						{
							stackMap = codeParentAttribute.attributes[i];
						}
					}
				}
			}

			var frame = {
				stack: [],
				variables: parameters || [],

				push: function(value)
				{
					//console.log('push: '+value);
					this.stack.push(value);
				},
				pop: function()
				{
					var value = this.stack.pop();
					//console.log('pop: '+value);
					return value;
				}
			};

			for(var i=0;i<code.length;i++)
			{
				var postOperation = this.runInstruction(code[i], frame, variable);
				if(postOperation!==false)
				{
					if(postOperation.action == 'return') break;
					else if(postOperation.action == 'goto')
					{
						if(postOperation.reason == 'if' || postOperation.reason == 'lookupswitch')
						{
							postOperation.offcet += code[i].pc;
						}

						var foundOffcet = false;
						for(var j=0;j<code.length;j++)
						{
							if(code[j].pc == postOperation.offcet)
							{
								i = j - 1;
								foundOffcet = true;
								continue;
							}
						}

						if(postOperation.offcet < 0)
						{
							var targetOperationOffcet = codeParentAttribute.codeOffset + postOperation.offcet;
							var newMethod = variable.class.findMethodByOffcet(targetOperationOffcet);
							console.log(newMethod);
						}

						if(foundOffcet) break;

						console.log(postOperation);
						console.log(code);
						console.log(i);
						console.log(thisMethodOutputName);
						console.log(variable);
						throw new Error("unfinished code");
					}
					else if(postOperation.action == 'next-thread')
					{
						var threadState = {
							operationIndex: i + 1,
							frame: frame,
							variable: variable,
							method: method,
							parameters: parameters,
							fallback: postOperation.state
						};

						return { action: 'next-thread', reason: 'thread', state: threadState };
					}
					else
					{
						console.log(postOperation);
						throw new Error("unknown post operation");
					}
				}
			}

			//console.log('end: '+thisMethodOutputName);
			return false;
		},

		runInstruction: function(instruction, frame, variable)
		{
			var opecodeName = Kvm.MachineConstants.opecodeNames[instruction.opecode];
			//console.log(opecodeName);
			switch(opecodeName)
			{
				case 'new':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var targetType = variable.class.getConstantName(constantIndex);

					this._runMemoryAllocate(targetType, frame, variable);
					break;

				case 'anewarray':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var targetType = variable.class.getConstantName(constantIndex);
					var count = frame.pop();

					var instance = { type: 'array', dimension: 1, elementType: targetType, value: new Array(count) };
					var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
					instance.memoryIndex = instanceIndex;

					frame.push(instanceIndex);
					break;

				case 'newarray':
					var typeIndex = instruction.operand[0];
					var count = frame.pop();

					var instance = { type: 'array', dimension: 1, elementType: Kvm.MachineConstants.arrayTypeMap[typeIndex], value: new Array(count) };
					var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
					instance.memoryIndex = instanceIndex;

					frame.push(instanceIndex);
					break;

				case 'multianewarray':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var dimensions = instruction.operand[2];

					var targetType = variable.class.getConstantName(constantIndex);
					var counts = [];
					for(var i=0;i<dimensions;i++)
						counts.push(frame.pop());

					this._runMemoryAllocateArray(targetType, counts, frame, variable);
					break;
				
				case 'iastore':
					var value = frame.pop();
					var index = frame.pop();
					var arrayRef = frame.pop();

					var arr = Kvm.MachineMemory.getPoolVariable(arrayRef);
					arr.value[index] = value;
					break;

				case 'sastore':
					var value = frame.pop();
					var index = frame.pop();
					var arrayRef = frame.pop();

					var arr = Kvm.MachineMemory.getPoolVariable(arrayRef);
					arr.value[index] = value;
					break;

				case 'bastore':
					var value = frame.pop();
					var index = frame.pop();
					var arrayRef = frame.pop();

					var arr = Kvm.MachineMemory.getPoolVariable(arrayRef);
					arr.value[index] = value;
					break;

				case 'invokespecial':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);
					return this._runInvokeSpecial(constant.class, constant.name, constant.description, frame, variable);
					break;

				case 'invokevirtual':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);
					return this._runInvokeVirtual(constant.class, constant.name, constant.description, frame, variable);
					break;

				case 'invokestatic':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);
					return this._runInvokeStatic(constant.class, constant.name, constant.description, frame, variable);
					break;

				case 'putstatic':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);

					var variableName = constant.class+'::'+constant.name+' as '+constant.description;
					var paramType = this._getDescriptionDetails(constant.description).type;

					if(paramType.startsWith('reference:'))
					{
						var poolIndex = frame.pop();
						if(poolIndex === null)
							Kvm.MachineMemory.setStaticVariable(variableName, null);
						else 
							Kvm.MachineMemory.setStaticVariable(variableName, Kvm.MachineMemory.getPoolVariable(poolIndex));
					}
					else 
					{
						Kvm.MachineMemory.setStaticVariable(variableName, frame.pop());
					}
					break;

				case 'getstatic':
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getClassNameDescription(constantIndex);

					var variableName = constant.class+'::'+constant.name+' as '+constant.description;
					var paramType = this._getDescriptionDetails(constant.description).type;

					if(!Kvm.MachineMemory.haveStaticVariable(variableName))
					{
						console.log('no static variable: '+variableName);
						console.log('trying init');
						this.initStaticClass(constant.class);
					}

					if(Kvm.MachineMemory.haveStaticVariable(variableName))
					{
						var staticVariable = Kvm.MachineMemory.getStaticVariable(variableName);

						if(staticVariable === null)
						{
							frame.push(staticVariable);
						}
						else if(paramType.startsWith('reference:'))
						{
							frame.push(staticVariable.memoryIndex);
						}
						else
						{
							frame.push(staticVariable);
						}
					}
					else
					{
						console.log('no static variable: '+variableName);
					}
					break;

				case 'idiv':
					var value2 = frame.pop();
					var value1 = frame.pop();
					frame.push(Math.floor(value1/value2));
					break;

				case 'iadd':
					var value2 = frame.pop();
					var value1 = frame.pop();
					frame.push(value1+value2);
					break;

				case 'ldc':
					var constant = variable.class.getConstant(instruction.operand[0]);
					var string = variable.class.getConstantString(constant.stringIndex);
					var index = Kvm.MachineMemory.createPoolVariable(string);
					frame.push(index);
					break;

				case 'aload_0':
					frame.push(variable.memoryIndex);
					break;

				case 'iload_0':
					frame.push(frame.variables[0]);
					break;
				case 'iload_1':
					frame.push(frame.variables[1]);
					break;
				case 'iload_2':
					frame.push(frame.variables[2]);
					break;
				case 'iload_3':
					frame.push(frame.variables[3]);
					break;

				case 'istore_0':
					frame.variables[0] = frame.pop();
					break;
				case 'istore_1':
					frame.variables[1] = frame.pop();
					break;
				case 'istore_2':
					frame.variables[2] = frame.pop();
					break;
				case 'istore_3':
					frame.variables[3] = frame.pop();
					break;

				case 'astore_0':
					frame.variables[0] = frame.pop();
					break;
				case 'astore_1':
					frame.variables[1] = frame.pop();
					break;
				case 'astore_2':
					frame.variables[2] = frame.pop();
					break;
				case 'astore_3':
					frame.variables[3] = frame.pop();
					break;

				case 'nop': break;
				case '<illegal opcode 253>': break;
				case 'impdep1': break; // reserved
				case 'impdep2': break; // reserved

				case 'aconst_null': frame.push(null); break;
				case 'iconst_m1': frame.push(-1); break;
				case 'iconst_0': frame.push(0); break;
				case 'iconst_1': frame.push(1); break;
				case 'iconst_2': frame.push(2); break;
				case 'iconst_3': frame.push(3); break;
				case 'iconst_4': frame.push(4); break;
				case 'iconst_5': frame.push(5); break;
				case 'lconst_0': frame.push(0); break;
				case 'lconst_1': frame.push(1); break;
				case 'bipush': frame.push(instruction.operand[0]); break;
				case 'sipush': frame.push(instruction.operand[0]*256+instruction.operand[1]); break;
				case 'pop': frame.pop(); break;
				case 'dup': var value = frame.pop(); frame.push(value); frame.push(value); break;

				case 'return': return { action: 'return' };

				case 'checkcast': 
					var constantIndex = instruction.operand[0]*256 + instruction.operand[1];
					var constant = variable.class.getConstantName(constantIndex);

					var reference = frame.pop();
					if(reference === null)
					{
						frame.push(null);
					}
					else
					{
						var pointedObject = Kvm.MachineMemory.getPoolVariable(reference);
						console.log(pointedObject);
						throw new Error("unready code");
					}
					break;

				case 'lookupswitch':
					var targetKey = frame.pop(); 
					var params = instruction.operand;

					var alignOffcet = params.length%4;
					var defaultOffcet = params[alignOffcet+0]*16777216 + params[alignOffcet+1]*65536 + params[alignOffcet+2]*256 + params[alignOffcet+3];
					var count = params[alignOffcet+4]*16777216 + params[alignOffcet+5]*65536 + params[alignOffcet+6]*256 + params[alignOffcet+7];
					var map = {};

					for(var i=0;i<count;i++)
					{
						var value = params[alignOffcet+11+i*8]*16777216 + 
									params[alignOffcet+10+i*8]*65536 + 
									params[alignOffcet+9+i*8]*256 + 
									params[alignOffcet+8+i*8];

						var key = params[alignOffcet+15+i*8]*16777216 + 
								  params[alignOffcet+14+i*8]*65536 + 
								  params[alignOffcet+13+i*8]*256 + 
								  params[alignOffcet+12+i*8];

						if(value > 2147483647)value -= 4294967296;

						map[key] = value;
					}

					if(map[targetKey]!== undefined)
						return { action: 'goto', reason: 'lookupswitch', offcet: map[targetKey] };
					else 
						return { action: 'goto', reason: 'lookupswitch', offcet: defaultOffcet };
					return;

				case 'goto':
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					return { action: 'goto', reason: 'goto', offcet: offcet };

				case 'ifne': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					if(value != 0) return { action: 'goto', reason: 'if', offcet: offcet };
					break;
				case 'ifeq': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					if(value === 0) return { action: 'goto', reason: 'if', offcet: offcet };
					break;
				case 'iflt': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					if(value < 0) return { action: 'goto', reason: 'if', offcet: offcet };
					break;
				case 'ifle': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					if(value <= 0) return { action: 'goto', reason: 'if', offcet: offcet };
					break;
				case 'ifgt': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					if(value > 0) return { action: 'goto', reason: 'if', offcet: offcet };
					break;
				case 'ifge': 
					var offcet = instruction.operand[0]*256 + instruction.operand[1];
					var value = frame.pop(); 
					if(value >= 0) return { action: 'goto', reason: 'if', offcet: offcet };
					break;

				default: 
					console.log('unknown instruction: '+opecodeName+' as 0x'+instruction.opecode.toString(16));
					break;
			}

			return false;
		},

		_runMemoryAllocate: function(type, frame, variable)
		{
			var instance = { type: 'object', class: type };
			var instanceIndex = Kvm.MachineMemory.createPoolVariable(instance);
			instance.memoryIndex = instanceIndex;

			if(type=='java/lang/Thread')
			{

			}
			else if(Kvm.Core.classes[type]!==undefined)
			{
				instance.type = 'class';
				instance.class = Kvm.Core.classes[type];

				var constructor = instance.class.findMethod('<init>');
				this.runMethod(instance, constructor);
			}
			else
			{
				console.log('unknown type allocation: '+type);
			}

			frame.push(instanceIndex);
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
			var parameterThis = null;

			for(var i=0;i<functionDetails.parameters.length;i++)
			{
				var paramType = functionDetails.parameters[i];
				if(paramType.startsWith('reference:'))
				{
					parameters.push(Kvm.MachineMemory.getPoolVariable(frame.pop()));
				}
				else 
				{
					parameters.push(frame.pop());
				}
			}

			if(mode == 'special' || mode == 'virtual')
				parameterThis = frame.pop();

			if(className == 'javax/microedition/midlet/MIDlet')
			{
				if(mode == 'special' && methodName == '<init>')
				{
					// what to do? by idea need init some values for variable
					return false;
				}
				if(mode == 'virtual' && methodName == 'getAppProperty')
				{
					var property = Kvm.Core.manifest[parameters[0]];
					var index = Kvm.MachineMemory.createPoolVariable(property);
					frame.push(index);
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
					variable.fullscreen = parameters[0];
					return false;
				}
			}
			else if(className == 'java/lang/Thread')
			{
				if(mode == 'special' && methodName == '<init>')
				{
					var targetInstance = Kvm.MachineMemory.getPoolVariable(parameterThis);
					targetInstance.thread = {};
					targetInstance.threadArgument = parameters[0];
					targetInstance.status = 'ready';
					targetInstance.priority = Kvm.MachineMemory.threads[Kvm.MachineMemory.activeThreadIndex].priority;	// from parent
					return false;
				}
				if(mode == 'virtual' && methodName == 'start')
				{
					var targetInstance = Kvm.MachineMemory.getPoolVariable(parameterThis);
					targetInstance.status = 'active';

					var targetMethod = targetInstance.threadArgument.class.findMethod('run');
					targetInstance.method = targetMethod;

					var threadIndex = Kvm.MachineMemory.registerThread(targetInstance);
					targetInstance.threadIndex = threadIndex;

					return false;
				}
				if(mode == 'virtual' && methodName == 'setPriority')
				{
					variable.priority = parameters[0];
					return false;
				}
				if(mode == 'static' && methodName == 'yield')
				{
					return { action: 'next-thread', reason: 'thread' };
				}
				if(mode == 'static' && methodName == 'currentThread')
				{
					frame.push(Kvm.MachineMemory.threads[Kvm.MachineMemory.activeThreadIndex].memoryIndex);
					return false;
				}
			}
			else if(className == 'java/lang/System')
			{
				if(mode == 'static' && methodName == 'currentTimeMillis')
				{
					frame.push(new Date().getTime());
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

					var staticConstructor = instance.class.findMethod(methodName, methodDescription);
					var staticConstructorResponse = false;
					if(staticConstructor!==undefined)
						staticConstructorResponse = this.runMethod(instance, staticConstructor, parameters);

					Kvm.MachineMemory.removePoolVariable(instanceIndex);
					return staticConstructorResponse;
				}
				else if(mode == 'special')
				{
					var targetInstance = Kvm.MachineMemory.getPoolVariable(parameterThis);
					var targetMethod = targetInstance.class.findMethod(methodName, methodDescription);
					return this.runMethod(targetInstance, targetMethod, parameters);
				}
			}

			console.log(mode+' invoke unknown: '+className+'::'+methodName+methodDescription);
			throw new Error("unfinished code");
		}
	},

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