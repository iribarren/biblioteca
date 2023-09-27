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

echo "Prueba".PHP_EOL;

echo "Aqui nos paramos".PHP_EOL;;

modoIron();

modoBlue();

echo " y terminamos".PHP_EOL;;