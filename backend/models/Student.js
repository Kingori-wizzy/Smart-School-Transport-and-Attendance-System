const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const studentSchema = new mongoose.Schema({
   admissionNumber: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
   rfidTag: { type: String, unique: true, sparse: true, trim: true },
   firstName: { type: String, required: true, trim: true },
   lastName: { type: String, required: true, trim: true },
   age: { type: Number, required: true, min: 3, max: 25 },
   gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
   classLevel: { type: String, required: true, index: true },
   stream: { type: String, trim: true },
   parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
   guardianContact: { type: String, required: true },
   usesTransport: { type: Boolean, default: false, index: true, required: true },
   transportDetails: {
     pickupPoint: { name: String, coordinates: { lat: Number, lng: Number } },
     dropoffPoint: { name: String, coordinates: { lat: Number, lng: Number } },
     busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', index: true },
     status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending'], default: 'pending' }
   },
   // Legacy fields for backward compatibility
   busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', deprecated: true },
   pickupPoint: { type: String, deprecated: true },
   dropOffPoint: { type: String, deprecated: true },
   qrCode: { type: String, unique: true, sparse: true, index: true },
   isActive: { type: Boolean, default: true, index: true }
}, { 
    timestamps: true, 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true } 
});

// Virtuals
studentSchema.virtual('fullName').get(function() {
   return `${this.firstName} ${this.lastName}`.trim();
});

studentSchema.virtual('name').get(function() {
   return `${this.firstName} ${this.lastName}`.trim();
});

// Middleware to sync legacy fields
studentSchema.pre('save', function(next) {
   if (this.usesTransport && this.transportDetails) {
     this.busId = this.transportDetails.busId || this.busId;
     this.pickupPoint = this.transportDetails.pickupPoint?.name || this.pickupPoint;
     this.dropOffPoint = this.transportDetails.dropoffPoint?.name || this.dropOffPoint;
   }
   next();
});

studentSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Student', studentSchema);
