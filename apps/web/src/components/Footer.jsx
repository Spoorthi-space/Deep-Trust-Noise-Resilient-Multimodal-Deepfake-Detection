import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-muted/50 text-muted-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg text-foreground">Deep Trust</span>
            </div>
            <p className="text-sm leading-relaxed">
              Advanced multimodal deepfake detection using audio-visual fusion and noise-resilient analysis.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/analyze" className="hover:text-primary transition-colors">Analyze Media</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link to="/demo" className="hover:text-primary transition-colors">Demo Gallery</Link></li>
              <li><Link to="/documentation" className="hover:text-primary transition-colors">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Research</h3>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-primary transition-colors cursor-pointer">Methodology</span></li>
              <li><span className="hover:text-primary transition-colors cursor-pointer">Publications</span></li>
              <li><span className="hover:text-primary transition-colors cursor-pointer">Team</span></li>
              <li><span className="hover:text-primary transition-colors cursor-pointer">Contact</span></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© 2026 Deep Trust. Research project for deepfake detection.</p>
          <div className="flex gap-6">
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;