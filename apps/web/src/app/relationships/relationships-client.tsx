"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { forceSimulation, forceManyBody, forceCenter, forceLink } from "d3-force";
import { Card, CardContent } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { toast } from "sonner";
import { Building2, User, Link2 } from "lucide-react";

interface Node {
  id: string;
  type: "facility" | "provider";
  name: string;
  role?: string;
  specialty?: string;
  city?: string;
  state?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  employment_type: string;
}

export default function RelationshipsClient() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const [relationships, setRelationships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
    if (profile && profile.user_type !== "facility") {
      router.push("/provider/dashboard");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width - 32, 600), height: 500 });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!user || profile?.user_type !== "facility") return;

    const fetchRelationships = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("provider_facility_relationships")
        .select("*, provider:providers(*), facility:facilities(*)");
      
      const rels = data ?? [];
      setRelationships(rels);

      // Build nodes
      const nodeMap = new Map<string, Node>();
      const linkList: Link[] = [];

      rels.forEach((rel: any) => {
        const facilityId = `facility-${rel.facility_id}`;
        const providerId = `provider-${rel.provider_id}`;

        if (!nodeMap.has(facilityId)) {
          nodeMap.set(facilityId, {
            id: facilityId,
            type: "facility",
            name: rel.facility?.name || "Unknown Facility",
            city: rel.facility?.city,
            state: rel.facility?.state,
          });
        }

        if (!nodeMap.has(providerId)) {
          nodeMap.set(providerId, {
            id: providerId,
            type: "provider",
            name: `${rel.provider?.first_name || ""} ${rel.provider?.last_name || ""}`,
            role: rel.provider?.role,
            specialty: rel.provider?.specialty,
          });
        }

        linkList.push({
          source: providerId,
          target: facilityId,
          employment_type: rel.employment_type,
        });
      });

      const nodeList = Array.from(nodeMap.values());
      
      // Run simulation
      const sim = forceSimulation<Node>(nodeList)
        .force("charge", forceManyBody().strength(-300))
        .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
        .force("link", forceLink<Node, Link>(linkList).id((d: any) => d.id).distance(120))
        .stop();

      // Run synchronously for a few iterations
      for (let i = 0; i < 300; i++) {
        sim.tick();
      }

      setNodes(nodeList);
      setLinks(linkList);
      setIsLoading(false);
    };

    fetchRelationships();
  }, [user, profile, supabase, dimensions.width, dimensions.height]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 10, y: e.clientY - 10 });
  }, []);

  const getNodeRadius = (node: Node) => (node.type === "facility" ? 28 : 18);
  const getNodeColor = (node: Node) => {
    if (node.type === "facility") return "#166534"; // green-800
    return "#22c55e"; // green-500
  };
  const getNodeStroke = (node: Node) => {
    if (node.type === "facility") return "#14532d"; // green-900
    return "#16a34a"; // green-600
  };

  const getLinkColor = (link: Link) => {
    return link.employment_type === "1099" ? "#a855f7" : "#3b82f6"; // purple for 1099, blue for W2
  };

  if (loading) return (
    <div className="container mx-auto p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (!user || profile?.user_type !== "facility") return null;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Relationship Graph</h1>
        <p className="text-muted-foreground">Visualize provider-facility relationships and employment types.</p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-800 border-2 border-green-900" />
          <span>Facility</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600" />
          <span>Provider</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-purple-500" />
          <span>1099</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500" />
          <span>W2</span>
        </div>
      </div>

      <div ref={containerRef} className="relative" onMouseMove={handleMouseMove}>
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : relationships.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                No relationships found. Add providers to facilities to see the graph.
              </div>
            ) : (
              <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full"
              >
                {/* Links */}
                {links.map((link, i) => {
                  const source = typeof link.source === "string" ? nodes.find((n) => n.id === link.source) : link.source;
                  const target = typeof link.target === "string" ? nodes.find((n) => n.id === link.target) : link.target;
                  if (!source || !target) return null;
                  
                  const midX = (source.x! + target.x!) / 2;
                  const midY = (source.y! + target.y!) / 2;
                  
                  return (
                    <g key={i}>
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={getLinkColor(link)}
                        strokeWidth={2}
                        opacity={hoveredLink === link ? 1 : 0.6}
                        onMouseEnter={() => setHoveredLink(link)}
                        onMouseLeave={() => setHoveredLink(null)}
                        className="cursor-pointer"
                      />
                      {/* Link label */}
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x={-16}
                          y={-10}
                          width={32}
                          height={20}
                          rx={4}
                          fill="white"
                          stroke={getLinkColor(link)}
                          strokeWidth={1}
                          className="dark:fill-gray-900"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={10}
                          fill={getLinkColor(link)}
                          fontWeight={600}
                        >
                          {link.employment_type}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                  const radius = getNodeRadius(node);
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        r={radius}
                        fill={getNodeColor(node)}
                        stroke={getNodeStroke(node)}
                        strokeWidth={2}
                        opacity={hoveredNode?.id === node.id ? 1 : 0.9}
                        style={{ filter: hoveredNode?.id === node.id ? "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" : "none" }}
                      />
                      {node.type === "facility" ? (
                        <Building2 x={-8} y={-8} width={16} height={16} fill="white" />
                      ) : (
                        <User x={-6} y={-6} width={12} height={12} fill="white" />
                      )}
                      <text
                        y={radius + 14}
                        textAnchor="middle"
                        fontSize={11}
                        fill="currentColor"
                        className="fill-foreground"
                        fontWeight={500}
                      >
                        {node.name.length > 15 ? node.name.substring(0, 15) + "..." : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tooltip */}
      {(hoveredNode || hoveredLink) && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-lg shadow-lg p-3 pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {hoveredNode && (
            <div className="space-y-1">
              <p className="font-semibold text-sm">{hoveredNode.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{hoveredNode.type}</p>
              {hoveredNode.role && (
                <p className="text-xs text-muted-foreground">{hoveredNode.role} | {hoveredNode.specialty}</p>
              )}
              {hoveredNode.city && (
                <p className="text-xs text-muted-foreground">{hoveredNode.city}, {hoveredNode.state}</p>
              )}
            </div>
          )}
          {hoveredLink && (
            <div className="space-y-1">
              <p className="font-semibold text-sm flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Employment Type
              </p>
              <p className="text-xs text-muted-foreground">
                {hoveredLink.employment_type === "1099" ? "1099 Contractor" : "W-2 Internal"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
