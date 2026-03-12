import { Leaf, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="gradient-bg rounded-lg p-1.5">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Food<span className="text-primary">Bridge</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connecting surplus food with those who need it most. Reducing waste, feeding communities.
          </p>
        </div>

        {[
          { title: "Platform", links: ["How It Works", "Features", "Pricing", "FAQ"] },
          { title: "Company", links: ["About Us", "Blog", "Careers", "Contact"] },
          { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy"] },
        ].map((section) => (
          <div key={section.title} className="space-y-3">
            <h4 className="font-display font-semibold text-foreground">{section.title}</h4>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link}>
                  <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © 2026 FoodBridge. All rights reserved.
        </p>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Made with <Heart className="h-3 w-3 text-destructive fill-destructive" /> for a sustainable future
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
