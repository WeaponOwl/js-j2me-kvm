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
					Kvm.Loader.files[entry.filename] = {
						name: entry.filename,
						size: entry.uncompressedSize,
						data: blob
					};

					Kvm.Loader.zipFilesRead++;
					Kvm.Loader.readZipFile();
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

	Kvm.Instructions = function(codes)
	{
		var operations = [];

		for(var i=0;i<codes.length;)
		{
			var commandCode = codes[i++];
			var command = { code: commandCode, name: commandCode.toString(16), param: [] };
			switch(commandCode)
			{
				//aaload
				//aastore
				//aconst_null
				//aload

				case 0x2a: 
					command.name = 'aload_0';
					break;
				case 0x2b: 
					command.name = 'aload_1';
					break;
				case 0x2c: 
					command.name = 'aload_2';
					break;
				case 0x2d: 
					command.name = 'aload_3';
					break;

				//anewarray
				//areturn
				//arraylength
				//astore
				//astore_n
				//athrow
				//baload
				//bastore

				case 0x10: 
					command.name = 'bipush';
					command.param.push(codes[i++]);
					break;

				//caload
				//castore
				//checkcast
				//d2f
				//d2i
				//d2l
				//dadd
				//daload
				//dastore
				//dcmp_op
				//dconst_d
				//ddiv
				//dload
				//dload_n
				//dmul
				//dneg
				//drem
				//dreturn
				//dstore
				//dstore_n
				//dsub
				//dup
				//dup_x1
				//dup_x2
				//dup2
				//dup2_x1
				//dup2_x2
				//f2d
				//f2i
				//f2l
				//fadd
				//faload
				//fastore
				//fcmp_op
				//fconst_f
				//fdiv
				//fload
				//fload_n
				//fmul
				//fneg
				//frem
				//freturn
				//fstore
				//fstore_n
				//fsub
				//getfield
				case 0xb2: 
					command.name = 'getstatic';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0xa7: 
					command.name = 'goto';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				//goto_w
				//i2b
				//i2c
				//i2d
				//i2f
				//i2l
				//i2s
				//iadd
				//iaload
				//iand
				//iastore

				case 0x2: 
					command.name = 'iconst_m1';
					break;
				case 0x3: 
					command.name = 'iconst_0';
					break;
				case 0x4: 
					command.name = 'iconst_1';
					break;
				case 0x5: 
					command.name = 'iconst_2';
					break;
				case 0x6:
					command.name = 'iconst_3';
					break;
				case 0x7: 
					command.name = 'iconst_4';
					break;
				case 0x8: 
					command.name = 'iconst_5';
					break;

				//idiv
				//if_acmp_cond
				//if_icmp_cond

				case 0x99: 
					command.name = 'ifeq';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0x9a: 
					command.name = 'ifne';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0x9b: 
					command.name = 'iflt';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0x9c: 
					command.name = 'ifge';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0x9d: 
					command.name = 'ifgt';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0x9e: 
					command.name = 'ifle';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;

				//ifnonnull
				//ifnull
				//iinc
				//iload
				//iload_n
				//imul
				//ineg
				//instanceof
				//invokedynamic
				//invokeinterface
				case 0xb7: 
					command.name = 'invokespecial';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0xb8: 
					command.name = 'invokestatic';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				case 0xb6: 
					command.name = 'invokevirtual';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				//ior
				//irem
				//ireturn
				//ishl
				//ishr
				//istore
				//istore_n
				//isub
				//iushr
				//ixor
				//jsr
				//jsr_w
				//l2d
				//l2f 
				//l2i
				//ladd
				//laload
				//land
				//lastore
				//lcmp
				//lconst_l
				case 0x12: 
					command.name = 'ldc';
					command.param.push(codes[i++]);
					break;
				//ldc_w
				//ldc2_w
				//ldiv
				//lload
				//lload_n
				//lmul
				//lneg
				//lookupswitch
				//lor
				//lrem
				//lreturn
				//lshl
				//lshr
				//lstore
				//lstore_n
				//lsub
				//lushr
				//lxor
				//monitorenter
				//monitorexit
				//multianewarray
				//new
				//newarray
				case 0x0: 
					command.name = 'nop';
					break;
				case 0x57: 
					command.name = 'pop';
					break;
				case 0x58: 
					command.name = 'pop2';
					break;
				//putfield
				case 0xb3: 
					command.name = 'putstatic';
					command.param.push(codes[i++]);
					command.param.push(codes[i++]);
					break;
				//ret
				case 0xb1: 
					command.name = 'return';
					break;
				//saload
				//sastore
				//sipush
				//swap
				//tableswitch
				//wide

				default: 
					console.log('unknown code command: '+command.name);
					i = codes.length;
					break;
			}

			operations.push(command);
		}

		return operations;
	};

	Kvm.Class = function() 
	{ 
		return {

			buffer: false,
			position: 0,
			
			header: {},

			name: null,
			constants: {},
			methods: {},
			fields: {},

			readByte: function() 
			{
				return this.buffer[this.position++];
			},

			readBytes: function(length) 
			{
				var output = [];
				for(var i=0;i<length;i++)
					output.push(this.buffer[this.position++]);

				return output;
			},

			readShort: function() 
			{
				var byte1 = this.buffer[this.position++];
				var byte2 = this.buffer[this.position++];
				return byte1 * 256 + byte2;
			},

			readInt: function() 
			{
				var byte1 = this.buffer[this.position++];
				var byte2 = this.buffer[this.position++];
				var byte3 = this.buffer[this.position++];
				var byte4 = this.buffer[this.position++];
				return byte1 * 16777216 + byte2 * 65536 + byte3 * 256 + byte4;
			},

			readAttribute: function()
			{
				var attribute = {};
				attribute.nameIndex = this.readShort();
				attribute.length = this.readInt();

				var originPosition = this.position;
				attribute.name = this.header.constantPool[attribute.nameIndex].value;

				if(attribute.name == 'Code')
				{
					attribute.code = {};
					attribute.code.maxStacks = this.readShort();
					attribute.code.maxlocals = this.readShort();
					attribute.code.codeLength = this.readInt();
					attribute.code.codes = this.readBytes(attribute.code.codeLength);

					attribute.exceptionTableLength = this.readShort();
					attribute.exceptionTable = [];
					for(var i=0;i<attribute.exceptionTableLength;i++)
					{
						var exceptionEntry = {};
						exceptionEntry.startPc = this.readShort();
						exceptionEntry.endPc = this.readShort();
						exceptionEntry.handlerPc = this.readShort();
						exceptionEntry.catchType = this.readShort();
						attribute.exceptionTable.push(exceptionEntry);
					}

					attribute.attributesCount = this.readShort();
					attribute.attributes = [];
					for(var i=0;i<attribute.attributesCount;i++)
					{
						attribute.attributes.push(this.readAttribute());
					}
				}
				else if(attribute.name == 'StackMap')	// maybe be 'StackMapTable' also...
				{
					attribute.stackMap = {};
					attribute.stackMap.numberOfEntries = this.readShort();
					attribute.stackMap.entries = [];
					for(var i=0;i<attribute.stackMap.numberOfEntries;i++)
					{
						var entry = {};

						entry.frameType = this.readByte();

						if(entry.frameType <= 63)
						{
							entry.frameTypeReadable = "same";
						}
						else
						{
							throw "stack map frame type unsupported yet: "+entry.frameType;
						}

						attribute.stackMap.entries.push(entry);
					}
				}
				else
				{
					throw "unknown attribute type: "+attribute.name;
				}

				this.position = originPosition + attribute.length;
				return attribute;
			},

			readConstant: function()
			{
				var constant = {};
				constant.tag = this.readByte();

				if(constant.tag == 1)	// utf 8 string
				{
					constant.tagReadable = 'utf8 string';
					constant.valueSize = this.readShort();
					constant.valueBytes = this.readBytes(constant.valueSize);
					constant.value = "";
					for(var j=0;j<constant.valueBytes.length;j++)
					{
						constant.value += String.fromCharCode(constant.valueBytes[j]);
					}
				}
				else if(constant.tag == 7)	// class
				{
					constant.tagReadable = 'class';
					constant.nameIndex = this.readShort();
				}
				else if(constant.tag == 9 || constant.tag == 10 || constant.tag == 11)	// field ref, method ref, interface ref
				{
					if(constant.tag == 9)
						constant.tagReadable = 'field';
					else if(constant.tag == 10)
						constant.tagReadable = 'method';
					else if(constant.tag == 11)
						constant.tagReadable = 'interface method';
					constant.classIndex = this.readShort();
					constant.nameTypeIndex = this.readShort();
				}
				else if(constant.tag == 8)	// string info
				{
					constant.tagReadable = 'string info';
					constant.stringIndex = this.readShort();
				}
				else if(constant.tag == 3)	// int
				{
					constant.tagReadable = 'int';
					constant.value = this.readInt();
				}
				else if(constant.tag == 12)	// string name and type
				{
					constant.tagReadable = 'string name and type';
					constant.nameIndex = this.readShort();
					constant.descriptionIndex = this.readShort();
				}
				else 
				{
					throw "unsupported yet constant type: "+constant.tag;
				}

				return constant;
			},

			getReadableAccessType: function(access)
			{
				var output = [];
				if(access & 0x1) output.push('public');
				if(access & 0x2) output.push('private');
				if(access & 0x4) output.push('protected');
				if(access & 0x8) output.push('static');
				if(access & 0x10) output.push('final');
				if(access & 0x20) output.push('super');
				if(access & 0x40) output.push('volatile');
				if(access & 0x80) output.push('transient');
				if(access & 0x200) output.push('interface');
				if(access & 0x400) output.push('abstract');
				if(access & 0x1000) output.push('synthetic');
				if(access & 0x2000) output.push('annotation');
				if(access & 0x4000) output.push('enum');

				return output.join(' ');
			},

			getReadableConstantClass: function(number)
			{
				var className = this.header.constantPool[number].nameIndex;
				return this.header.constantPool[className].value;
			},

			getReadableStringType: function(number)
			{
				return this.header.constantPool[number].value;
			},

			initSuccess: function()
			{
				this.header.magic = ['0x'+this.readByte().toString(16), '0x'+this.readByte().toString(16), '0x'+this.readByte().toString(16), '0x'+this.readByte().toString(16)];
				this.header.minorVersion = this.readShort();
				this.header.majorVersion = this.readShort();
				this.header.constantPoolCount = this.readShort();
				this.header.constantPool = {};

				// here all right. indexing from 1 and constantPoolCount-1 amount
				for(var i=1;i<this.header.constantPoolCount;i++)
				{
					this.header.constantPool[i] = this.readConstant();
				}

				this.header.accessFlags = this.readShort();
				this.header.thisClass = this.readShort();
				this.header.superClass = this.readShort();
				this.header.intefraceCount = this.readShort();
				this.header.intefraces = [];
				for(var i=0;i<this.header.intefraceCount;i++)
				{
					this.header.intefraces.push(this.readShort());
				}
				this.header.fieldsCount = this.readShort();
				this.header.fields = [];
				for(var i=0;i<this.header.fieldsCount;i++)
				{
					var fieldInfo = {};
					fieldInfo.accessFlags = this.readShort();
					fieldInfo.nameIndex = this.readShort();
					fieldInfo.descriptorIndex = this.readShort();
					fieldInfo.attributesCount = this.readShort();
					fieldInfo.attributes = [];

					for(var j=0;j<fieldInfo.attributesCount;j++)
					{
						fieldInfo.attributes.push(this.readAttribute());
					}

					this.header.fields.push(fieldInfo);
				}

				this.header.methodsCount = this.readShort();
				this.header.methods = [];
				for(var i=0;i<this.header.methodsCount;i++)
				{
					var methodInfo = {};
					methodInfo.accessFlags = this.readShort();
					methodInfo.nameIndex = this.readShort();
					methodInfo.descriptorIndex = this.readShort();
					methodInfo.attributesCount = this.readShort();
					methodInfo.attributes = [];

					for(var j=0;j<methodInfo.attributesCount;j++)
					{
						methodInfo.attributes.push(this.readAttribute());
					}

					this.header.methods.push(methodInfo);
				}

				this.header.attributesCount = this.readShort();
				this.header.attributes = [];
				for(var i=0;i<this.header.attributesCount;i++)
				{
					this.header.attributes.attributes.push(this.readAttribute());
				}

				this.decompiled = {};
				this.decompiled.accessFlags = this.getReadableAccessType(this.header.accessFlags);
				this.decompiled.class = this.getReadableConstantClass(this.header.thisClass);
				this.decompiled.super = this.getReadableConstantClass(this.header.superClass);
				this.decompiled.fields = [];
				this.decompiled.methods = [];

				for(var i=0;i<this.header.fieldsCount;i++)
				{
					var field = {};

					field.accessFlags = this.getReadableAccessType(this.header.fields[i].accessFlags);
					field.name = this.getReadableStringType(this.header.fields[i].nameIndex);
					field.description = this.getReadableStringType(this.header.fields[i].descriptorIndex);

					this.decompiled.fields.push(field);
				}

				for(var i=0;i<this.header.methodsCount;i++)
				{
					var method = {};

					method.accessFlags = this.getReadableAccessType(this.header.methods[i].accessFlags);
					method.name = this.getReadableStringType(this.header.methods[i].nameIndex);
					method.description = this.getReadableStringType(this.header.methods[i].descriptorIndex);

					// attribute name must be 'Code' name
					method.code = Kvm.Instructions(this.header.methods[i].attributes[0].code.codes);
					this.decompiled.methods.push(method);
				}

				this.name = this.decompiled.class;
				this.constants = this.header.constantPool;
				this.fields = this.decompiled.fields;
				this.methods = this.decompiled.methods;

				Kvm.Core.appendClass(this);
			},

			init: function(blob)
			{
				var reader = new FileReader();
				var current = this;
				reader.onload = function() {
					current.buffer = new Uint8Array(reader.result);
					current.initSuccess();
				};
				reader.readAsArrayBuffer(blob);
			}
		};
	};

	Kvm.Machine = {
		run: function(runClass)
		{
			var constructor = null;
			for(var i=0;i<runClass.methods.length;i++)
				if(runClass.methods[i].name == '<init>')
				{
					constructor = runClass.methods[i];
				}

			this.runMethod(constructor, runClass);
		},

		runMethod: function(method, callerClass)
		{
			//console.log(method);
			this.runInstructions(method.code, callerClass);
		},

		runInstructions: function(instructions, callerClass)
		{
			for(var i=0;i<instructions.length;i++)
			{
				var command = instructions[i];

				switch(command.name)
				{
					//aaload
					//aastore
					//aconst_null
					//aload
					//aload_0
					//aload_1
					//aload_2
					//aload_3
					//anewarray
					//areturn
					//arraylength
					//astore
					//astore_n
					//athrow
					//baload
					//bastore
					//bipush
					//caload
					//castore
					//checkcast
					//d2f
					//d2i
					//d2l
					//dadd
					//daload
					//dastore
					//dcmp_op
					//dconst_d
					//ddiv
					//dload
					//dload_n
					//dmul
					//dneg
					//drem
					//dreturn
					//dstore
					//dstore_n
					//dsub
					//dup
					//dup_x1
					//dup_x2
					//dup2
					//dup2_x1
					//dup2_x2
					//f2d
					//f2i
					//f2l
					//fadd
					//faload
					//fastore
					//fcmp_op
					//fconst_f
					//fdiv
					//fload
					//fload_n
					//fmul
					//fneg
					//frem
					//freturn
					//fstore
					//fstore_n
					//fsub
					//getfield
					//getstatic
					//goto
					//goto_w
					//i2b
					//i2c
					//i2d
					//i2f
					//i2l
					//i2s
					//iadd
					//iaload
					//iand
					//iastore
					//iconst_m1
					//iconst_0
					//iconst_1
					//iconst_2
					//iconst_3
					//iconst_4
					//iconst_5
					//idiv
					//if_acmp_cond
					//if_icmp_cond
					//ifeq
					//ifne
					//iflt
					//ifge
					//ifgt
					//ifle
					//ifnonnull
					//ifnull
					//iinc
					//iload
					//iload_n
					//imul
					//ineg
					//instanceof
					//invokedynamic
					//invokeinterface
					case 'invokespecial':
						var poolIndex = command.param[0] * 256 + command.param[1];
						var constantMethod = callerClass.constants[poolIndex];
						var constantClass = callerClass.constants[constantMethod.classIndex];
						var constantNameType = callerClass.constants[constantMethod.nameTypeIndex];

						var constantClassName = callerClass.constants[constantClass.nameIndex].value;
						var constantMethodName = callerClass.constants[constantNameType.nameIndex].value;
						var constantDescriptionName = callerClass.constants[constantNameType.descriptionIndex].value;

						console.log(constantClassName);
						console.log(constantMethodName);
						console.log(constantDescriptionName);
						break;
					//invokestatic
					//invokevirtual
					//ior
					//irem
					//ireturn
					//ishl
					//ishr
					//istore
					//istore_n
					//isub
					//iushr
					//ixor
					//jsr
					//jsr_w
					//l2d
					//l2f 
					//l2i
					//ladd
					//laload
					//land
					//lastore
					//lcmp
					//lconst_l
					//ldc
					//ldc_w
					//ldc2_w
					//ldiv
					//lload
					//lload_n
					//lmul
					//lneg
					//lookupswitch
					//lor
					//lrem
					//lreturn
					//lshl
					//lshr
					//lstore
					//lstore_n
					//lsub
					//lushr
					//lxor
					//monitorenter
					//monitorexit
					//multianewarray
					//new
					//newarray
					//nop
					//pop
					//pop2
					//putfield
					//putstatic
					//ret
					//return
					//saload
					//sastore
					//sipush
					//swap
					//tableswitch
					//wide

					default:
						console.log('no command processing: '+command.name);
						break;
				}
			}
		}
	},

	Kvm.Core = {
		manifest: {},

		name: false,
		icon: false,
		baseClass: false,

		classes: {},

		appendClass: function(insertClass)
		{
			this.classes[insertClass.name] = insertClass;
			console.log('class append');
			console.log(insertClass);

			if(insertClass.name == this.baseClass)
				Kvm.Machine.run(this.classes[this.baseClass]);
		},

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
			this.baseClass = midletInfo[2];

			var baseClass = new Kvm.Class();
			baseClass.init(Kvm.Loader.files[this.baseClass+'.class'].data);
		},

		loadFile(filename)
		{

		},

		loadSuccess: function() {
			var manifestData = Kvm.Loader.files['META-INF/MANIFEST.MF'].data;

			var reader = new FileReader();
			reader.onload = function() {
				Kvm.Core.loadManifest(reader.result);
			};
			reader.readAsText(manifestData);
		}
	};
}
(window.jQuery, window, document);