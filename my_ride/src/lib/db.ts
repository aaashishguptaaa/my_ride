import mongoose from "mongoose"

const mongodbUrl=process.env.MONGODB_URL

if(!mongodbUrl){
    throw new Error("db url not found!")
}

let cached = (global as any).mongooseConn
if (!cached) {
    cached = (global as any).mongooseConn = { conn: null, promise: null }
}

const connectDb = async () => {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongodbUrl, {
            serverSelectionTimeoutMS: 5000,
        }).then((m) => m.connection)
    }

    try {
        const conn = await cached.promise
        cached.conn = conn
        return conn
    } catch (error) {
        cached.promise = null
        cached.conn = null
        console.error("MongoDB connection error:", error)
        throw error
    }
}

export default connectDb