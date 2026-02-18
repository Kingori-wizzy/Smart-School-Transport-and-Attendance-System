function isPointInPolygon(point, polygon) {
  let x = point.lat, y = point.lon;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].lat, yi = polygon[i].lon;
    let xj = polygon[j].lat, yj = polygon[j].lon;

    let intersect =
      ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = { isPointInPolygon };
