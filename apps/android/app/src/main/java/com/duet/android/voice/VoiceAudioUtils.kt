package com.duet.android.voice

import java.io.File
import java.io.OutputStream
import java.io.RandomAccessFile
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sqrt

const val VOICE_SAMPLE_RATE_HZ = 16_000
const val VOICE_CHANNEL_COUNT = 1
const val VOICE_BITS_PER_SAMPLE = 16
const val VOICE_WAV_FILENAME = "android-voice.wav"
const val VOICE_WAV_MIME_TYPE = "audio/wav"
const val VOICE_M4A_FILENAME = "android-voice.m4a"
const val VOICE_M4A_MIME_TYPE = "audio/mp4"

private const val WAV_HEADER_BYTES = 44
private const val VISUALIZER_LEVEL_COUNT = 24
private const val VISUALIZER_SMOOTHING = 0.32f
private const val VISUALIZER_NOISE_FLOOR = 0.018f
private val DEFAULT_LEVELS = List(VISUALIZER_LEVEL_COUNT) { 0f }

data class VoiceUploadMetadata(
    val filename: String,
    val mimeType: String
)

fun voiceUploadMetadata(filename: String?, mimeType: String?): VoiceUploadMetadata {
    val lowerName = filename.orEmpty().lowercase()
    val lowerMime = mimeType.orEmpty().lowercase()
    return when {
        lowerName.endsWith(".wav") || lowerMime.contains("wav") -> VoiceUploadMetadata(VOICE_WAV_FILENAME, VOICE_WAV_MIME_TYPE)
        lowerName.endsWith(".m4a") || lowerMime.contains("mp4") || lowerMime.contains("m4a") -> VoiceUploadMetadata(VOICE_M4A_FILENAME, VOICE_M4A_MIME_TYPE)
        else -> VoiceUploadMetadata(VOICE_WAV_FILENAME, VOICE_WAV_MIME_TYPE)
    }
}

fun defaultVoiceLevels(): List<Float> = DEFAULT_LEVELS

fun smoothPcmVoiceLevels(previous: List<Float>, next: List<Float>): List<Float> {
    return next.mapIndexed { index, level ->
        val before = previous.getOrNull(index) ?: level
        before + (level - before) * VISUALIZER_SMOOTHING
    }
}

fun buildPcmVoiceLevels(samples: ShortArray, sampleCount: Int): List<Float> {
    val count = sampleCount.coerceIn(0, samples.size)
    if (count <= 0) return DEFAULT_LEVELS

    return List(VISUALIZER_LEVEL_COUNT) { index ->
        val start = (count * index) / VISUALIZER_LEVEL_COUNT
        val end = max(start + 1, (count * (index + 1)) / VISUALIZER_LEVEL_COUNT).coerceAtMost(count)
        var sumSquares = 0.0
        var peak = 0f
        var read = 0

        for (cursor in start until end) {
            val centered = kotlin.math.abs(samples[cursor] / Short.MAX_VALUE.toFloat()).coerceIn(0f, 1f)
            sumSquares += centered * centered
            peak = max(peak, centered)
            read += 1
        }

        val rms = if (read > 0) sqrt(sumSquares / read).toFloat() else 0f
        val gated = max(0f, (rms - VISUALIZER_NOISE_FLOOR) / (1f - VISUALIZER_NOISE_FLOOR))
        val boosted = gated.toDouble().pow(0.58).toFloat() * 1.35f + peak * 0.18f
        min(1f, max(0f, boosted))
    }
}

fun createWavHeader(
    pcmByteCount: Int,
    sampleRate: Int = VOICE_SAMPLE_RATE_HZ,
    channelCount: Int = VOICE_CHANNEL_COUNT,
    bitsPerSample: Int = VOICE_BITS_PER_SAMPLE
): ByteArray {
    val byteRate = sampleRate * channelCount * bitsPerSample / 8
    val blockAlign = channelCount * bitsPerSample / 8
    val totalDataLen = pcmByteCount + WAV_HEADER_BYTES - 8
    val header = ByteArray(WAV_HEADER_BYTES)

    header.writeAscii(0, "RIFF")
    header.writeIntLe(4, totalDataLen)
    header.writeAscii(8, "WAVE")
    header.writeAscii(12, "fmt ")
    header.writeIntLe(16, 16)
    header.writeShortLe(20, 1)
    header.writeShortLe(22, channelCount)
    header.writeIntLe(24, sampleRate)
    header.writeIntLe(28, byteRate)
    header.writeShortLe(32, blockAlign)
    header.writeShortLe(34, bitsPerSample)
    header.writeAscii(36, "data")
    header.writeIntLe(40, pcmByteCount)

    return header
}

fun writePcm16LittleEndian(output: OutputStream, samples: ShortArray, sampleCount: Int) {
    val count = sampleCount.coerceIn(0, samples.size)
    val bytes = ByteArray(count * 2)
    for (index in 0 until count) {
        val sample = samples[index].toInt()
        val offset = index * 2
        bytes[offset] = (sample and 0xff).toByte()
        bytes[offset + 1] = ((sample shr 8) and 0xff).toByte()
    }
    output.write(bytes)
}

fun rewriteWavHeader(file: File, pcmByteCount: Int) {
    RandomAccessFile(file, "rw").use { wav ->
        wav.seek(0)
        wav.write(createWavHeader(pcmByteCount))
    }
}

private fun ByteArray.writeAscii(offset: Int, value: String) {
    value.forEachIndexed { index, char -> this[offset + index] = char.code.toByte() }
}

private fun ByteArray.writeIntLe(offset: Int, value: Int) {
    this[offset] = (value and 0xff).toByte()
    this[offset + 1] = ((value shr 8) and 0xff).toByte()
    this[offset + 2] = ((value shr 16) and 0xff).toByte()
    this[offset + 3] = ((value shr 24) and 0xff).toByte()
}

private fun ByteArray.writeShortLe(offset: Int, value: Int) {
    this[offset] = (value and 0xff).toByte()
    this[offset + 1] = ((value shr 8) and 0xff).toByte()
}
