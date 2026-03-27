<?php

declare(strict_types=1);

namespace App\Oracle;

/**
 * Provides oracle tables and random selection for La Biblioteca.
 *
 * All tables are normalized to an array of ['value' => string, 'hint' => string].
 * Values are kept in Spanish (game content); hints are in English.
 */
class OracleService
{
    /** @var array<int, array{value: string, hint: string}> */
    private const GENRE_TABLE = [
        ['value' => 'Fantasía',          'hint' => ''],
        ['value' => 'XXXPunk',           'hint' => ''],
        ['value' => 'Mitos de Cthulhu',  'hint' => ''],
        ['value' => 'Sobrenatural',      'hint' => ''],
        ['value' => 'Romance',           'hint' => ''],
        ['value' => 'Investigación',     'hint' => ''],
    ];

    /** @var array<int, array{value: string, hint: string}> */
    private const EPOCH_TABLE = [
        ['value' => 'Antigüedad',    'hint' => ''],
        ['value' => 'Medieval',      'hint' => ''],
        ['value' => 'Renacimiento',  'hint' => ''],
        ['value' => 'Victoriana',    'hint' => ''],
        ['value' => 'Contemporanea', 'hint' => ''],
        ['value' => 'Futuro',        'hint' => ''],
    ];

    /** @var array<int, array{value: string, hint: string}> */
    private const BINDING_TABLE = [
        ['value' => 'Piel humana', 'hint' => 'Horror, cruelty, pain, feelings'],
        ['value' => 'Cuero',       'hint' => 'History, religion, countryside, animals'],
        ['value' => 'Hueso',       'hint' => 'Life, death, antiquity, ancestors'],
        ['value' => 'Cartulina',   'hint' => 'Simplicity, utility, practical, cheap'],
        ['value' => 'Madera',      'hint' => 'Rustic, hardness, craftsmanship'],
        ['value' => 'Terciopelo',  'hint' => 'Luxury, tenderness, softness'],
    ];

    /** @var array<int, array{value: string, hint: string}> */
    private const COLOR_TABLE = [
        ['value' => 'Negro',  'hint' => 'Darkness, night, hidden'],
        ['value' => 'Rojo',   'hint' => 'Passion, romance, warmth'],
        ['value' => 'Morado', 'hint' => 'Mysticism, wisdom'],
        ['value' => 'Verde',  'hint' => 'Nature, hope'],
        ['value' => 'Azul',   'hint' => 'Sky, sea, freedom'],
        ['value' => 'Blanco', 'hint' => 'Purity, light, day'],
    ];

    /** @var array<int, array{value: string, hint: string}> */
    private const SMELL_TABLE = [
        ['value' => 'Flores silvestres',   'hint' => 'Countryside, nature, life'],
        ['value' => 'Mar',                 'hint' => 'Open spaces, water, freedom'],
        ['value' => 'Tierra mojada',       'hint' => 'Rain, harvest, resolution'],
        ['value' => 'Especias de cocina',  'hint' => 'Home, comfort, exoticism'],
        ['value' => 'Fruta podrida',       'hint' => 'Unpleasant, death, deterioration'],
        ['value' => 'Madera quemada',      'hint' => 'Fire, destruction, rubble'],
    ];

    /** @var array<int, array{value: string, hint: string}> */
    private const INTERIOR_TABLE = [
        ['value' => 'Lomo y cubierta decorados de filigranas doradas y plateadas', 'hint' => ''],
        ['value' => 'Guarniciones de hierro en las esquinas y cerrado con un candado', 'hint' => ''],
        ['value' => 'Título y detalles en relieve en la parte frontal y trasera del libro', 'hint' => ''],
        ['value' => 'Tratado pictórico con dibujos de gran calidad', 'hint' => ''],
        ['value' => 'Caligrafía exquisita con distintos dibujos', 'hint' => ''],
        ['value' => 'Escrito en alfabeto desconocido y con muchas ilustraciones extrañas', 'hint' => ''],
    ];

    /**
     * Returns a random entry from the given table.
     *
     * @param array<int, array{value: string, hint: string}> $table
     * @return array{value: string, hint: string}
     */
    public function getRandomFromTable(array $table): array
    {
        $index = random_int(0, count($table) - 1);
        return $table[$index];
    }

    /** @return array<int, array{value: string, hint: string}> */
    public function getGenreTable(): array
    {
        return self::GENRE_TABLE;
    }

    /** @return array<int, array{value: string, hint: string}> */
    public function getEpochTable(): array
    {
        return self::EPOCH_TABLE;
    }

    /** @return array<int, array{value: string, hint: string}> */
    public function getBindingTable(): array
    {
        return self::BINDING_TABLE;
    }

    /** @return array<int, array{value: string, hint: string}> */
    public function getColorTable(): array
    {
        return self::COLOR_TABLE;
    }

    /** @return array<int, array{value: string, hint: string}> */
    public function getSmellTable(): array
    {
        return self::SMELL_TABLE;
    }

    /** @return array<int, array{value: string, hint: string}> */
    public function getInteriorTable(): array
    {
        return self::INTERIOR_TABLE;
    }
}
