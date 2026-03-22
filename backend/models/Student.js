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
   
   // CRITICAL: Bus number field for driver app lookup
   busNumber: { type: String, index: true, sparse: true },
   
   transportDetails: {
     pickupPoint: { 
       name: { type: String },
       coordinates: { 
         lat: { type: Number },
         lng: { type: Number }
       }
     },
     dropoffPoint: { 
       name: { type: String },
       coordinates: { 
         lat: { type: Number },
         lng: { type: Number }
       }
     },
     busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', index: true },
     busNumber: { type: String, index: true },
     status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending'], default: 'pending' }
   },
   
   // Trip assignments - which trips this student is assigned to
   tripAssignments: [{
     tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
     tripType: { type: String, enum: ['morning', 'afternoon'] },
     status: { type: String, enum: ['active', 'inactive'], default: 'active' },
     assignedAt: { type: Date, default: Date.now }
   }],
   
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

// Method to check if student is assigned to a specific trip
studentSchema.methods.isAssignedToTrip = function(tripId) {
   return this.tripAssignments?.some(assignment => 
     assignment.tripId?.toString() === tripId.toString() && 
     assignment.status === 'active'
   );
};

// Method to get all active trips for this student
studentSchema.methods.getActiveTrips = function() {
   return this.tripAssignments?.filter(assignment => assignment.status === 'active') || [];
};

// Method to assign student to a trip
studentSchema.methods.assignToTrip = async function(tripId, tripType) {
   if (!this.isAssignedToTrip(tripId)) {
     this.tripAssignments.push({
       tripId,
       tripType,
       status: 'active',
       assignedAt: new Date()
     });
     await this.save();
     return true;
   }
   return false;
};

// Method to remove student from a trip
studentSchema.methods.removeFromTrip = async function(tripId) {
   const assignment = this.tripAssignments?.find(a => a.tripId?.toString() === tripId.toString());
   if (assignment) {
     assignment.status = 'inactive';
     await this.save();
     return true;
   }
   return false;
};

// Method to sync bus number from busId
studentSchema.methods.syncBusNumber = async function() {
   const Bus = mongoose.model('Bus');
   const busId = this.transportDetails?.busId || this.busId;
   
   if (busId) {
     const bus = await Bus.findById(busId);
     if (bus && bus.busNumber) {
       this.busNumber = bus.busNumber;
       if (this.transportDetails) {
         this.transportDetails.busNumber = bus.busNumber;
       }
       return true;
     }
   }
   return false;
};

// Pre-save middleware to sync bus number
studentSchema.pre('save', async function(next) {
   // Sync bus number from busId
   const busId = this.transportDetails?.busId || this.busId;
   
   if (busId) {
     try {
       const Bus = mongoose.model('Bus');
       const bus = await Bus.findById(busId);
       if (bus && bus.busNumber) {
         this.busNumber = bus.busNumber;
         if (this.transportDetails) {
           this.transportDetails.busNumber = bus.busNumber;
         }
       }
     } catch (error) {
       console.error('Error syncing bus number:', error);
     }
   }
   
   // Sync legacy fields for backward compatibility
   if (this.usesTransport && this.transportDetails) {
     this.busId = this.transportDetails.busId || this.busId;
     this.pickupPoint = this.transportDetails.pickupPoint?.name || this.pickupPoint;
     this.dropOffPoint = this.transportDetails.dropoffPoint?.name || this.dropOffPoint;
   }
   
   next();
});

// Static method to sync all students
studentSchema.statics.syncAllBusNumbers = async function() {
   const students = await this.find({ usesTransport: true });
   let updated = 0;
   
   for (const student of students) {
     const synced = await student.syncBusNumber();
     if (synced) {
       await student.save();
       updated++;
     }
   }
   
   return updated;
};

studentSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Student', studentSchema);