import React, { useEffect, useRef, useState } from "react";
import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";

/**
 * GraphView3D
 * - 3D force graph (three.js)
 * - halo + label lumineux
 * - focus caméra au clic
 * - particules sur les liens au survol
 */
export default function GraphView3D({ data }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [hoverNode, setHoverNode] = useState(null);

  // helper label sprite avec glow
  const makeLabelSprite = (text, color = "#e2e8f0") => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    ctx.font = "600 46px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(22, 11, 1); // largeur, hauteur
    sprite.position.set(0, 9, 0);
    return sprite;
  };

  // init une seule fois
  useEffect(() => {
    if (!containerRef.current || fgRef.current) return;

    const fg = ForceGraph3D({ controlType: "orbit" })(containerRef.current);
    fgRef.current = fg;

    fg
      .backgroundColor("#0b1220") // fond dark
      .nodeId("id")
      .nodeLabel(n => n.label || n.name || n.id)
      .nodeRelSize(5)
      .nodeVal(n => n.val ?? 4)
      .linkOpacity(0.35)
      .linkColor(() => "rgba(148,163,184,0.7)") // slate-400
      .linkWidth(l =>
        hoverNode && (l.source?.id === hoverNode.id || l.target?.id === hoverNode.id) ? 2 : 0.7
      )
      .linkDirectionalParticles(l =>
        hoverNode && (l.source?.id === hoverNode.id || l.target?.id === hoverNode.id) ? 4 : 0
      )
      .linkDirectionalParticleWidth(2)
      .onNodeHover(n => setHoverNode(n || null))
      .onNodeClick(node => {
        const distance = 120;
        const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
        fg.cameraPosition(
          { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
          node,
          1200
        );
      })
      // halo + noyau + label
      .nodeThreeObject(node => {
        const group = new THREE.Group();

        // noyau
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(4),
          new THREE.MeshBasicMaterial({
            color: node.color || "#a78bfa" /* violet-400 */,
          })
        );

        // halo doux
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(6.5),
          new THREE.MeshBasicMaterial({
            color: node.color || "#a78bfa",
            transparent: true,
            opacity: 0.16,
          })
        );

        group.add(sphere);
        group.add(halo);

        // label
        const label = makeLabelSprite(node.label || node.name || node.id);
        group.add(label);

        return group;
      });

    // taille responsive
    const onResize = () => {
      const { clientWidth, clientHeight } = containerRef.current;
      fg.width(clientWidth);
      fg.height(clientHeight);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hoverNode]);

  // données (sécurité si back renvoie autre forme)
  useEffect(() => {
    const safe = {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      links: Array.isArray(data?.links) ? data.links : [],
    };
    if (fgRef.current) {
      fgRef.current.graphData(safe);
      // force un refresh quand hover change (pour recalcul des fonctions)
      fgRef.current.linkWidth(fgRef.current.linkWidth());
      fgRef.current.linkDirectionalParticles(fgRef.current.linkDirectionalParticles());
    }
  }, [data, hoverNode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[72vh] rounded-2xl"
      style={{ background: "transparent" }}
    />
  );
}
