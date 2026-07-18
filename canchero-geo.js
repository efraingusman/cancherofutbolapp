/**
 * canchero-geo.js
 * Dataset de países (50) con sus ciudades principales + helper para
 * poblar selects dependientes (país → ciudad). Reutilizable en Buscar,
 * Ranking, Desafiar y cualquier sección con filtro país/ciudad.
 */
(function(){
'use strict';

const COUNTRIES = [
  { n:'Uruguay', c:['Montevideo','Salto','Paysandú','Las Piedras','Rivera','Maldonado','Tacuarembó','Melo','Mercedes','Artigas','Minas','San José','Durazno','Florida','Treinta y Tres','Rocha','Trinidad','Colonia del Sacramento','Fray Bentos','Canelones','Punta del Este','Carmelo'] },
  { n:'Argentina', c:['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata','San Miguel de Tucumán','Mar del Plata','Salta','Santa Fe','San Juan','Resistencia','Neuquén','Posadas','Bahía Blanca','Paraná','Formosa','San Salvador de Jujuy','Corrientes','Río Cuarto','Comodoro Rivadavia'] },
  { n:'Brasil', c:['São Paulo','Río de Janeiro','Brasilia','Salvador','Fortaleza','Belo Horizonte','Manaus','Curitiba','Recife','Porto Alegre','Belém','Goiânia','Guarulhos','Campinas','Florianópolis'] },
  { n:'Chile', c:['Santiago','Valparaíso','Concepción','La Serena','Antofagasta','Temuco','Rancagua','Talca','Arica','Iquique','Puerto Montt','Viña del Mar'] },
  { n:'Paraguay', c:['Asunción','Ciudad del Este','San Lorenzo','Luque','Capiatá','Lambaré','Fernando de la Mora','Encarnación','Pedro Juan Caballero'] },
  { n:'Bolivia', c:['La Paz','Santa Cruz de la Sierra','Cochabamba','Sucre','Oruro','Tarija','Potosí','El Alto'] },
  { n:'Perú', c:['Lima','Arequipa','Trujillo','Chiclayo','Piura','Cusco','Iquitos','Huancayo','Tacna'] },
  { n:'Colombia', c:['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Cúcuta','Bucaramanga','Pereira','Santa Marta','Manizales'] },
  { n:'Ecuador', c:['Quito','Guayaquil','Cuenca','Santo Domingo','Machala','Manta','Portoviejo','Ambato','Loja'] },
  { n:'Venezuela', c:['Caracas','Maracaibo','Valencia','Barquisimeto','Maracay','Ciudad Guayana','Maturín','Mérida'] },
  { n:'México', c:['Ciudad de México','Guadalajara','Monterrey','Puebla','Tijuana','León','Querétaro','Mérida','Cancún','Toluca','Chihuahua'] },
  { n:'Estados Unidos', c:['Nueva York','Los Ángeles','Miami','Chicago','Houston','Dallas','Phoenix','Filadelfia','San Antonio','San Diego','Las Vegas','Orlando'] },
  { n:'Canadá', c:['Toronto','Montreal','Vancouver','Calgary','Ottawa','Edmonton','Winnipeg','Quebec'] },
  { n:'España', c:['Madrid','Barcelona','Valencia','Sevilla','Zaragoza','Málaga','Murcia','Bilbao','Las Palmas','Vigo','Granada'] },
  { n:'Portugal', c:['Lisboa','Oporto','Braga','Coímbra','Funchal','Faro','Setúbal'] },
  { n:'Italia', c:['Roma','Milán','Nápoles','Turín','Florencia','Bolonia','Génova','Venecia','Palermo'] },
  { n:'Francia', c:['París','Marsella','Lyon','Toulouse','Niza','Nantes','Burdeos','Lille','Estrasburgo'] },
  { n:'Alemania', c:['Berlín','Múnich','Hamburgo','Colonia','Fráncfort','Stuttgart','Düsseldorf','Dortmund','Leipzig'] },
  { n:'Reino Unido', c:['Londres','Mánchester','Birmingham','Liverpool','Glasgow','Leeds','Edimburgo','Bristol'] },
  { n:'Países Bajos', c:['Ámsterdam','Róterdam','La Haya','Utrecht','Eindhoven'] },
  { n:'Bélgica', c:['Bruselas','Amberes','Gante','Brujas','Lieja'] },
  { n:'Suiza', c:['Zúrich','Ginebra','Basilea','Berna','Lausana'] },
  { n:'Austria', c:['Viena','Graz','Linz','Salzburgo','Innsbruck'] },
  { n:'Irlanda', c:['Dublín','Cork','Limerick','Galway'] },
  { n:'Suecia', c:['Estocolmo','Gotemburgo','Malmö','Upsala'] },
  { n:'Noruega', c:['Oslo','Bergen','Trondheim','Stavanger'] },
  { n:'Dinamarca', c:['Copenhague','Aarhus','Odense','Aalborg'] },
  { n:'Finlandia', c:['Helsinki','Espoo','Tampere','Turku'] },
  { n:'Polonia', c:['Varsovia','Cracovia','Łódź','Breslavia','Poznań','Gdansk'] },
  { n:'Grecia', c:['Atenas','Tesalónica','Patras','Heraclión'] },
  { n:'Rusia', c:['Moscú','San Petersburgo','Novosibirsk','Ekaterimburgo','Kazán'] },
  { n:'Turquía', c:['Estambul','Ankara','Esmirna','Bursa','Antalya'] },
  { n:'Marruecos', c:['Casablanca','Rabat','Marrakech','Fez','Tánger'] },
  { n:'Egipto', c:['El Cairo','Alejandría','Guiza','Luxor'] },
  { n:'Sudáfrica', c:['Johannesburgo','Ciudad del Cabo','Durban','Pretoria'] },
  { n:'Nigeria', c:['Lagos','Abuya','Kano','Ibadán'] },
  { n:'Japón', c:['Tokio','Osaka','Yokohama','Nagoya','Kioto','Sapporo','Fukuoka'] },
  { n:'China', c:['Pekín','Shanghái','Cantón','Shenzhen','Chengdú','Wuhan'] },
  { n:'Corea del Sur', c:['Seúl','Busan','Incheon','Daegu'] },
  { n:'India', c:['Bombay','Nueva Delhi','Bangalore','Calcuta','Chennai','Hyderabad'] },
  { n:'Australia', c:['Sídney','Melbourne','Brisbane','Perth','Adelaida'] },
  { n:'Nueva Zelanda', c:['Auckland','Wellington','Christchurch','Hamilton'] },
  { n:'Costa Rica', c:['San José','Alajuela','Cartago','Heredia','Liberia'] },
  { n:'Panamá', c:['Ciudad de Panamá','Colón','David','Santiago'] },
  { n:'Guatemala', c:['Ciudad de Guatemala','Quetzaltenango','Escuintla'] },
  { n:'Honduras', c:['Tegucigalpa','San Pedro Sula','La Ceiba'] },
  { n:'El Salvador', c:['San Salvador','Santa Ana','San Miguel'] },
  { n:'República Dominicana', c:['Santo Domingo','Santiago de los Caballeros','La Romana','Punta Cana'] },
  { n:'Cuba', c:['La Habana','Santiago de Cuba','Camagüey','Holguín'] },
  { n:'Puerto Rico', c:['San Juan','Ponce','Bayamón','Mayagüez'] },
];

window.CancheroGeo = {
  countries: COUNTRIES,
  countryNames: function(){ return COUNTRIES.map(c=>c.n); },
  citiesOf: function(country){ const f = COUNTRIES.find(c=>c.n===country); return f? f.c : []; },

  /**
   * Pobla un <select> de países y vincula otro <select> de ciudades.
   * @param countrySel  elemento select de país
   * @param citySel     elemento select de ciudad
   * @param onChange    callback opcional al cambiar
   */
  bindSelects: function(countrySel, citySel, onChange){
    if (!countrySel) return;
    countrySel.innerHTML = '<option value="">País (todos)</option>' +
      COUNTRIES.map(c=>`<option value="${c.n}">${c.n}</option>`).join('');
    const fillCities = ()=>{
      if (!citySel) return;
      const cs = window.CancheroGeo.citiesOf(countrySel.value);
      citySel.innerHTML = '<option value="">Ciudad (todas)</option>' + cs.map(x=>`<option value="${x}">${x}</option>`).join('');
      citySel.disabled = !cs.length;
    };
    countrySel.addEventListener('change', ()=>{ fillCities(); onChange&&onChange(); });
    if (citySel) citySel.addEventListener('change', ()=>onChange&&onChange());
    fillCities();
  },

  /** HTML de un par país/ciudad listos para bindSelects (mismos estilos dark) */
  selectsHTML: function(idPrefix){
    const stl = 'flex:1;min-width:90px;height:38px;background:#111;border:1px solid #222;border-radius:12px;color:#fff;font-size:12px;padding:4px 10px;outline:none;';
    return `<select id="${idPrefix}-country" style="${stl}"></select><select id="${idPrefix}-city" style="${stl}" disabled></select>`;
  }
};

console.log('[canchero-geo] ✅ '+COUNTRIES.length+' países cargados');
})();
