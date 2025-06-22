import React from 'react';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="border-t border-soft-orange-200/50">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Dilly Dally</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Stop worrying about who owes what. Our smart video analysis automatically detects receipts and splits expenses with your friends.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-soft-orange-600 hover:text-soft-orange-700 transition-colors">
                                <Facebook size={20} />
                            </a>
                            <a href="#" className="text-soft-orange-600 hover:text-soft-orange-700 transition-colors">
                                <Twitter size={20} />
                            </a>
                            <a href="#" className="text-soft-orange-600 hover:text-soft-orange-700 transition-colors">
                                <Instagram size={20} />
                            </a>
                            <a href="#" className="text-soft-orange-600 hover:text-soft-orange-700 transition-colors">
                                <Linkedin size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    About Us
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Features
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Pricing
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Contact
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Blog
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Support</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Help Center
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    API Reference
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Status Page
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                                    Community
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center space-x-3 text-gray-600">
                                <Mail size={16} />
                                <span>hello@dillydally.com</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-600">
                                <Phone size={16} />
                                <span>+1 (555) 123-4567</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-600">
                                <MapPin size={16} />
                                <span>123 Innovation St, Tech City, TC 12345</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-soft-orange-200/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="text-sm text-gray-600">
                        © 2024 Dilly Dally. All rights reserved.
                    </div>
                    <div className="flex space-x-6 text-sm">
                        <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                            Terms of Service
                        </a>
                        <a href="#" className="text-gray-600 hover:text-soft-orange-600 transition-colors">
                            Cookie Policy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 