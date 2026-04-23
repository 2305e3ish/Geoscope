import {useEffect,useRef} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MapBox({bbox, center = [20, 78], marker = null}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!ref.current) return;
    const mapCenter = marker?.latlng || center;
    const mapZoom = marker?.latlng ? 5 : 4;
    const map=L.map(ref.current).setView(mapCenter, mapZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OSM"}).addTo(map);
    if(bbox?.length===4){
      const [minLon,minLat,maxLon,maxLat]=bbox;
      const rect=L.rectangle([[minLat,minLon],[maxLat,maxLon]],{weight:1});
      rect.addTo(map);
      map.fitBounds([[minLat,minLon],[maxLat,maxLon]]);
    }
    if(marker?.latlng){
      const leafletMarker=L.marker(marker.latlng);
      if(marker.popup){
        leafletMarker.bindPopup(marker.popup);
      }
      leafletMarker.addTo(map);
    }
    return()=>map.remove();
  },[bbox, center, marker]);
  return <div ref={ref} style={{height:380,marginTop:16,borderRadius:12}}/>;
}
