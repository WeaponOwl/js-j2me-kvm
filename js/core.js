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

	Kvm.Class = function(blob) 
	{ 
		return {
			blob: blob,
			buffer: false,

			position: 0,

			header: {},

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

				console.log(this.header);
				console.log(this.buffer);
			},

			init: function()
			{
				var reader = new FileReader();
				var current = this;
				reader.onload = function() {
					current.buffer = new Uint8Array(reader.result);
					current.initSuccess();
				};
				reader.readAsArrayBuffer(this.blob);
			}
		};
	};

	Kvm.Core = {
		manifest: {},

		name: false,
		icon: false,
		baseClass: false,

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

			var baseClass = new Kvm.Class(Kvm.Loader.files[this.baseClass+'.class'].data);
			baseClass.init();
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