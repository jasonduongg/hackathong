"use client";
import React from "react";
import { motion } from "motion/react";

export const TestimonialsColumn = (props: {
    className?: string;
    testimonials: typeof testimonials;
    duration?: number;
}) => {
    return (
        <div className={props.className}>
            <motion.div
                animate={{
                    y: "-50%",
                }}
                transition={{
                    duration: props.duration || 10,
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "loop",
                }}
                className="flex flex-col gap-6 pb-6 bg-soft-orange-25"
            >
                {[
                    ...new Array(2).fill(0).map((_, index) => (
                        <React.Fragment key={index}>
                            {props.testimonials.map(({ text, image, name, role }, i) => (
                                <div className="p-10 rounded-3xl border shadow-lg shadow-primary/10 max-w-xs w-full bg-soft-orange-25/80 backdrop-blur-sm" key={i}>
                                    <div>{text}</div>
                                    <div className="flex items-center gap-2 mt-5">
                                        <img
                                            width={40}
                                            height={40}
                                            src={image}
                                            alt={name}
                                            className="h-10 w-10 rounded-full"
                                        />
                                        <div className="flex flex-col">
                                            <div className="font-medium tracking-tight leading-5">{name}</div>
                                            <div className="leading-5 opacity-60 tracking-tight">{role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </React.Fragment>
                    )),
                ]}
            </motion.div>
        </div>
    );
};

const testimonials = [
    {
        text: "This app is a game-changer for group trips! The AI automatically detects receipts from our videos and splits expenses perfectly. No more manual calculations or arguments about who owes what.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        name: "Briana Patton",
        role: "Travel Group Organizer",
    },
    {
        text: "The Instagram integration is brilliant! I can find cool activities on social media and the AI instantly extracts all the details and costs. Planning group trips has never been easier.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        name: "Bilal Ahmed",
        role: "Adventure Traveler",
    },
    {
        text: "Finally, an app that actually works! The receipt scanning is incredibly accurate and the automatic expense splitting saves us hours of manual work after every group dinner.",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        name: "Saman Malik",
        role: "Social Media Influencer",
    },
    {
        text: "As someone who organizes frequent group events, this app has revolutionized how we handle expenses. The AI analysis is spot-on and the interface is so intuitive.",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        name: "Omar Raza",
        role: "Event Planner",
    },
    {
        text: "The video analysis feature is incredible! Just record a quick video of any receipt and it automatically extracts all the details. Perfect for busy professionals who don't have time to manually input expenses.",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        name: "Zainab Hussain",
        role: "Business Consultant",
    },
    {
        text: "Planning our group vacation was a breeze with this app. The AI analyzed Instagram posts and YouTube videos to give us accurate cost estimates and activity details. Highly recommend!",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
        name: "Aliza Khan",
        role: "Travel Blogger",
    },
    {
        text: "This app solved all our group expense problems. The receipt scanning works with any format and the automatic splitting is always accurate. No more awkward money conversations!",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        name: "Farhan Siddiqui",
        role: "Tech Entrepreneur",
    },
    {
        text: "The AI-powered expense tracking is revolutionary. It understands different receipt formats and automatically categorizes expenses. Perfect for both personal and business use.",
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
        name: "Sana Sheikh",
        role: "Marketing Director",
    },
    {
        text: "I love how the app can analyze social media content to help plan trips. Found an amazing restaurant on Instagram and the AI instantly extracted the menu, location, and estimated costs for our group.",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
        name: "Hassan Ali",
        role: "Food Blogger",
    },
];

export { testimonials }; 