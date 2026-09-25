import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
dotenv.config()
const port = process.env.PORT || 5000
const mongodbUrl=process.env.MONGODB_URL
import http from "http"
import { Server } from "socket.io"
import User from "./models/user.model.js"
const connectDb=async () => {
    try {
        await mongoose.connect(mongodbUrl)
        console.log("db connected")
    } catch (error) {
        console.log("db error")
    }
}

const app=express()
app.use(express.json())
const server=http.createServer(app)

const allowedOrigins = process.env.NEXT_BASE_URL 
    ? [process.env.NEXT_BASE_URL, "http://localhost:3000"] 
    : "*"

const io=new Server(server,{
    cors:{
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
})


app.post("/emit",async (req,res)=>{
const {event,userId,data,roomId,broadcast}=req.body
try {
    if(broadcast || (!roomId && !userId)){
        io.emit(event,data)
    }
    if(roomId){
        io.to(`kyc-${roomId}`).emit(event,data)
        io.to(`ride-${roomId}`).emit(event,data)
    }
    if(userId){
        io.to(`user-${userId}`).emit(event,data)
        const user=await User.findById(userId)
        if(user && user.socketId){
            io.to(user.socketId).emit(event,data)
        }
    }
    return res.json({success:true})
} catch (error) {
    return res.json({success:false})
}
})

io.on("connection",(socket)=>{
  
   socket.on("identity",async (userId)=>{
      if(!userId) return;
      socket.userId=userId
      socket.join(`user-${userId}`)
      await User.findByIdAndUpdate(userId,{
        socketId:socket.id,
        isOnline:true
      })
   })

   socket.on("join-kyc",(roomId)=>{
    console.log("join kyc room", roomId)
    socket.join(`kyc-${roomId}`)
   })

   socket.on("end-kyc",({roomId,action,reason})=>{
    console.log("end kyc room", roomId, action)
    io.to(`kyc-${roomId}`).emit("kyc-ended",{action,reason})
   })

   socket.on("update-location",async ({userId,latitude,longitude})=>{
    await User.findByIdAndUpdate(userId,{
        location:{
            type:"Point",
            coordinates:[longitude,latitude]
        }
    })
   })

   socket.on("join-ride",(bookingId)=>{
    console.log("join ride",bookingId)
    socket.join(`ride-${bookingId}`)
   })

   socket.on("driver-location-update",({bookingId,latitude,longitude,status})=>{
    io.to(`ride-${bookingId}`).emit("driver-location",{
        latitude,
        longitude
    })
   })

   socket.on("chat-message",(data)=>{
    io.to(`ride-${data.bookingId}`).emit("chat-message",data)
   })


   socket.on("disconnect",async ()=>{
    if(!socket.userId)return;
await User.findByIdAndUpdate(socket.userId,{
        socketId:null,
        isOnline:false
      })
   })

})




server.listen(port,()=>{
    console.log("server started")
    connectDb()
})
