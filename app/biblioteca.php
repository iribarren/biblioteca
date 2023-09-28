<?php

function tirarDado($caras) {
    return rand(1, $caras);
}

function hacerTiradaIronSworn($atributo) {
    $pa = tirarDado(6) + $atributo;
    $dd1 = tirarDado(10);
    $dd2 = tirarDado(10);


    if ($pa < $dd1 && $pa < $dd2) {
        return 'M';
    } else if ($pa >= $dd1 && $pa >= $dd2) {
        return "H";
    } else {
        return 'W';
    }
}

function hacerTiradaBlueBeard($atributo) {
    $d = tirarDado(6) + tirarDado(6) + $atributo;

    if ($d < 7) {
        return 'M';
    } else if ($d > 9) {
        return "H";
    } else {
        return 'W';
    }
}

function modoIron() {

    $atributos = [
        'f' => 2,
        'm' => 2,
        's' => 2,
    ];

    $h = 0;
    $w = 0;
    $m = 0;

    echo "Modo ironsworn:".PHP_EOL;
    for ($i = 0; $i < 1000 ; $i++ ) {
        foreach ($atributos as $atributo => $valor) {
            //echo "Jugamos capitulo con atributo ". $atributo.PHP_EOL;
            $resultadoTirada = hacerTiradaIronSworn($valor);
            //echo "Resultado de la tirada ". $resultadoTirada.PHP_EOL;
            switch ($resultadoTirada) {
                case 'H':
                    $h++;
                    break;
                case 'W':
                    $w++;
                    break;
                case 'M':
                    $m++;
                    break;
                default:
                    break;
            }
        }
    }


    echo 'hit: '  . $h.PHP_EOL;
    echo 'weak: ' . $w.PHP_EOL;
    echo 'miss: ' . $m.PHP_EOL;
}

function modoBlue() {
    echo "Modo bluebeard:".PHP_EOL;
    $atributos = [
        'f' => 0,
        'm' => 0,
        's' => 0,
    ];
    $h = 0;
    $w = 0;
    $m = 0;
    for ($i = 0; $i < 1000 ; $i++ ) {
        foreach ($atributos as $atributo => $valor) {
            //echo "Jugamos capitulo con atributo ". $atributo.PHP_EOL;
            $resultadoTirada = hacerTiradaBlueBeard($valor);
            //echo "Resultado de la tirada ". $resultadoTirada.PHP_EOL;
            switch ($resultadoTirada) {
                case 'H':
                    $h++;
                    break;
                case 'W':
                    $w++;
                    break;
                case 'M':
                    $m++;
                    break;
                default:
                    break;
            }
        }
    }
    echo 'hit: '  . $h.PHP_EOL;
    echo 'weak: ' . $w.PHP_EOL;
    echo 'miss: ' . $m.PHP_EOL;
}

function oraculo($tabla) {
    return $tabla[tirarDado(count($tabla)) -1];
}

$tablaGenero = [
    'Fantasía',
    'XXXPunk',
    'Mitos de Cthulhu',
    'Sobrenatural',
    'Romance',
    'Investigación',
];

$tablaEpoca = [
    'Antigüedad',
    'Medieval',
    'Renacimiento',
    'Victoriana',
    'Contemporanea',
    'Futuro',
];

$tablaEncuadernacion = [
    ['Piel humana' => 'Terror, crueldad, dolor, sentimientos'],
    ['Cuero' => 'Historia, religión, Campo, Animales'],
    ['Hueso' => 'Vida, Muerte, antiguedad, antepasados'],
    ['Cartulina' => 'Simpleza, utilidad, práctico, barato'],
    ['Madera' => 'Rústico, dureza, Oficios'],
    ['Terciopelo' => 'Lujo, Ternura, suavidad'],
];

$tablaColor = [
    ['Negro' => 'Oscuridad, noche, oculto'],
    ['Rojo' => 'Pasión, romance, calor'],
    ['Morado' => 'Misticismo, Sabiduria'],
    ['Verde' => 'Naturaleza, esperanza'],
    ['Azul' => 'Cielo, Mar, Libertad'],
    ['Blanco' => 'Pureza, luz, día'],
];

$tablaOlor = [
    'Flores silvestres',
    'Mar',
    'Tierra mojada',
    'Especias de cocina',
    'Fruta podrida',
    'Madera quemada',
];

$tablaEstilo = [
    'Lomo y cubierta decorados de filigranas doradas y plateadas',
    'Guarniciones de hierro en las esquinas y cerrado con un candado',
    'Título y detalles en relieve en la parte frontal y trasera del libro',
    'Tratado pictórico con dibujos de gran calidad',
    'Caligrafía exquisita con distintos dibujos',
    'Escrito en alfabeto desconocido y con muchas ilustraciones extrañas',
];

//modoIron();

//modoBlue();

$genero = oraculo($tablaGenero);
$epoca = oraculo($tablaEpoca);
$olor = oraculo($tablaOlor);
$colorArr = oraculo($tablaColor);
$color = key($colorArr);
$colorAyuda = current($colorArr);
$encuadernacionArr = oraculo($tablaEncuadernacion);
$encuadernacion = key($encuadernacionArr);
$encuadernacionAyuda = current($encuadernacionArr);
$estilo = oraculo($tablaEstilo);

echo "Visualiza una biblioteca " . $genero . " en la epoca " . $epoca . "<br />";

echo "Visualiza un libro con las siguientes caracteristicas: <br />";

echo "Encuadernacion:" . $encuadernacion ."<br />";
echo "Color:" . $color ."<br />";
echo "Olor:" . $olor ."<br />";
echo "Estilo:" . $estilo ."<br />";