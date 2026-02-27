"use client";

import { cn } from "@/lib/utils";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

// =============================================================================
// MAP EMBED
// Google Maps or OpenStreetMap embed
// =============================================================================

interface MapEmbedProps {
  address?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  provider?: "google" | "openstreetmap";
  height?: string;
  className?: string;
}

export function MapEmbed({
  address,
  lat,
  lng,
  zoom = 15,
  provider = "google",
  height = "400px",
  className,
}: MapEmbedProps) {
  const getMapUrl = () => {
    if (provider === "google") {
      if (lat && lng) {
        return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f${zoom}.1!3m3!1m2!1s0x0%3A0x0!2zM!5e0!3m2!1sfr!2sbe!4v1`;
      }
      if (address) {
        return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(address)}&zoom=${zoom}`;
      }
    }

    if (provider === "openstreetmap") {
      if (lat && lng) {
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
      }
    }

    return "";
  };

  return (
    <div className={cn("w-full rounded-xl overflow-hidden", className)}>
      <iframe
        src={getMapUrl()}
        width="100%"
        height={height}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Map"
      />
    </div>
  );
}

// =============================================================================
// STATIC MAP
// Static map image (no iframe)
// =============================================================================

interface StaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  marker?: boolean;
  className?: string;
}

export function StaticMap({
  lat,
  lng,
  zoom = 15,
  width = 600,
  height = 400,
  marker = true,
  className,
}: StaticMapProps) {
  // Using OpenStreetMap static tiles
  const tileUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}${marker ? `&markers=${lat},${lng},red` : ""}`;

  return (
    <div className={cn("rounded-xl overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tileUrl}
        alt="Map"
        width={width}
        height={height}
        className="w-full h-auto"
      />
    </div>
  );
}

// =============================================================================
// CONTACT MAP SECTION
// Map with contact information
// =============================================================================

interface ContactInfo {
  address?: string;
  phone?: string;
  email?: string;
  hours?: string[];
}

interface ContactMapSectionProps {
  title?: string;
  description?: string;
  mapAddress?: string;
  mapLat?: number;
  mapLng?: number;
  contact: ContactInfo;
  reversed?: boolean;
  className?: string;
}

export function ContactMapSection({
  title = "Nous trouver",
  description,
  mapAddress,
  mapLat,
  mapLng,
  contact,
  reversed = false,
  className,
}: ContactMapSectionProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            "grid md:grid-cols-2 gap-8 items-stretch",
            reversed && "md:flex-row-reverse"
          )}
        >
          {/* Contact Info */}
          <div
            className={cn(
              "bg-card border rounded-xl p-8 flex flex-col justify-center",
              reversed ? "md:order-2" : ""
            )}
          >
            <div className="space-y-6">
              {contact.address && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Adresse</h3>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {contact.address}
                    </p>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Téléphone</h3>
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
              )}

              {contact.email && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}

              {contact.hours && contact.hours.length > 0 && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Horaires</h3>
                    <div className="text-muted-foreground">
                      {contact.hours.map((hour, i) => (
                        <p key={i}>{hour}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className={reversed ? "md:order-1" : ""}>
            <MapEmbed
              address={mapAddress}
              lat={mapLat}
              lng={mapLng}
              height="100%"
              className="h-full min-h-[400px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MULTIPLE LOCATIONS
// Map with multiple location cards
// =============================================================================

interface Location {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
}

interface MultipleLocationsProps {
  title?: string;
  locations: Location[];
  className?: string;
}

export function MultipleLocations({
  title = "Nos agences",
  locations,
  className,
}: MultipleLocationsProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {title}
          </h2>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-card border rounded-xl overflow-hidden"
            >
              {location.lat && location.lng && (
                <StaticMap
                  lat={location.lat}
                  lng={location.lng}
                  height={200}
                  zoom={14}
                />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold">{location.name}</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  {location.address}
                </p>
                {location.phone && (
                  <a
                    href={`tel:${location.phone}`}
                    className="block mt-2 text-sm text-primary hover:underline"
                  >
                    {location.phone}
                  </a>
                )}
                {location.email && (
                  <a
                    href={`mailto:${location.email}`}
                    className="block mt-1 text-sm text-primary hover:underline"
                  >
                    {location.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
