var Kvm = window.Kvm || {};

if (window.jQuery === undefined) jQuery = $ = {};

!function($, window, document)
{
	Kvm.Loader = {
		bytes: [],
		position: 0,

		files: [],
		directories: [],
		directoryEnd: null,

		readByte: function() {
			var byte = this.bytes[this.position++];
			return byte;
		},

		readBytes: function(count) {
			var bytes = [];
			for(var i=0;i<count;i++)
				bytes.push(this.bytes[this.position++]);
			return bytes;
		},

		readBytesAsString: function(count) {
			var string = "";
			for(var i=0;i<count;i++)
				string += String.fromCharCode(this.bytes[this.position++]);
			return string;
		},

		readShort: function() {
			var byte1 = this.bytes[this.position++];
			var byte2 = this.bytes[this.position++];
			return byte2 * 256 + byte1;
		},

		readInt: function() {
			var byte1 = this.bytes[this.position++];
			var byte2 = this.bytes[this.position++];
			var byte3 = this.bytes[this.position++];
			var byte4 = this.bytes[this.position++];
			return byte4 * 16777216 + byte3 * 65536 + byte2 * 256 + byte1;
		},

		decompress: function(data, method)
		{
			if(method == 0)
			{
				return data;
			}

			// deflate
			if(method == 8)
			{
				return data;
			}

			console.log('uknown compress method: '+method);
			return data;
		},

		loadJar: function(base64Blob)
		{
			this.bytes = Base64Binary.decode(base64Blob); 

			while(this.position < this.bytes.length)
			{
				var signature = [ this.readByte(), this.readByte(), this.readByte(), this.readByte() ];

				if(signature[0] == 80 && signature[1] == 75 && signature[2] == 3 && signature[3] == 4)
				{
					var compressedFile = {};

					compressedFile.header = {};
					compressedFile.header.signature = signature;
					compressedFile.header.version = [ this.readByte(), this.readByte() ];
					compressedFile.header.generalPurposeBitFlag = this.readShort();
					compressedFile.header.compressMethod = this.readShort();
					compressedFile.header.modificationTime = this.readShort();
					compressedFile.header.modificationDate = this.readShort();
					compressedFile.header.crc32 = this.readInt();
					compressedFile.header.compressedSize = this.readInt();
					compressedFile.header.uncompressedSize = this.readInt();
					compressedFile.header.fileNameLength = this.readShort();
					compressedFile.header.extraFileFieldsLength = this.readShort();
					compressedFile.header.fileName = this.readBytesAsString(compressedFile.header.fileNameLength);
					compressedFile.header.extraFileFields = this.readBytes(compressedFile.header.extraFileFieldsLength);

					compressedFile.name = compressedFile.header.fileName;
					compressedFile.compressedData = this.readBytes(compressedFile.header.compressedSize);
					compressedFile.uncompressedData = this.decompress(compressedFile.compressedData, compressedFile.header.compressMethod);

					this.files[compressedFile.header.fileName] = compressedFile;
				}
				else if(signature[0] == 80 && signature[1] == 75 && signature[2] == 1 && signature[3] == 2)
				{
					var centralDirectory = {};

					centralDirectory.header = {};
					centralDirectory.header.signature = signature;
					centralDirectory.header.versionOrigin = [ this.readByte(), this.readByte() ];
					centralDirectory.header.verstionExtract = [ this.readByte(), this.readByte() ];
					centralDirectory.header.generalPurposeBitFlag = this.readShort();
					centralDirectory.header.compressMethod = this.readShort();
					centralDirectory.header.modificationTime = this.readShort();
					centralDirectory.header.modificationDate = this.readShort();
					centralDirectory.header.crc32 = this.readInt();
					centralDirectory.header.compressedSize = this.readInt();
					centralDirectory.header.uncompressedSize = this.readInt();
					centralDirectory.header.fileNameLength = this.readShort();
					centralDirectory.header.extraFileFieldsLength = this.readShort();
					centralDirectory.header.fileCommentLength = this.readShort();
					centralDirectory.header.diskNumber = this.readShort();
					centralDirectory.header.internalFileAttributes = this.readShort();
					centralDirectory.header.externalFileAttributes = this.readInt();
					centralDirectory.header.localFileHeaderOffcet = this.readInt();

					centralDirectory.header.fileName = this.readBytesAsString(centralDirectory.header.fileNameLength);
					centralDirectory.header.extraFileFields = this.readBytes(centralDirectory.header.extraFileFieldsLength);
					centralDirectory.header.fileComment = this.readBytesAsString(centralDirectory.header.fileCommentLength);

					this.directories[centralDirectory.header.fileName] = centralDirectory;
				}
				else if(signature[0] == 80 && signature[1] == 75 && signature[2] == 5 && signature[3] == 6)
				{
					var centralDirectoryEnd = {};

					centralDirectoryEnd.signature = signature;
					centralDirectoryEnd.diskNumber = this.readShort();
					centralDirectoryEnd.startDiskNumber = this.readShort();
					centralDirectoryEnd.centralDirectoryThisDiskNumber = this.readShort();
					centralDirectoryEnd.directoriesCount = this.readShort();
					centralDirectoryEnd.centralDirectorySize = this.readInt();
					centralDirectoryEnd.centralDirectoryOffcet = this.readInt();
					centralDirectoryEnd.commentLength = this.readShort();
					centralDirectoryEnd.comment = this.readBytesAsString(centralDirectoryEnd.commentLength);

					this.directoryEnd = centralDirectoryEnd;
				}
				else
				{
					console.log('unknow signature');
					console.log(signature);
					return;
				}
			}
		}
	};

	Kvm.Core = {
		run: function(base64Blob)
		{
			var parsed = Kvm.Loader.loadJar(base64Blob);

			console.log(Kvm.Loader);
		}
	};
}
(window.jQuery, window, document);